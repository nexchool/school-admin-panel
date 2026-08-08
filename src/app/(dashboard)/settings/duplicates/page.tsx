"use client";

import { useState } from "react";
import { AlertTriangle, Loader2, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  useDuplicateSuggestions,
  useMergePeople,
} from "@/hooks/usePeopleMerge";
import type {
  DuplicateSuggestion,
  PersonSummary,
} from "@/services/peopleMergeService";
import { formatDate } from "@/components/detail";

/** What a record is in the school — and what makes two of them irreconcilable. */
function holdings(person: PersonSummary): string[] {
  const held: string[] = [];
  if (person.hasAccount) held.push("account");
  if (person.isEmployed) held.push("employed");
  if (person.isStudent) held.push("student");
  return held;
}

function PersonCard({
  person,
  keeping,
  onKeep,
  disabled,
}: {
  person: PersonSummary;
  keeping: boolean;
  onKeep: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onKeep}
      disabled={disabled}
      className={[
        "flex-1 rounded-md border p-3 text-left transition-colors",
        keeping
          ? "border-primary bg-primary/5"
          : "border-border hover:border-muted-foreground/40",
        disabled ? "cursor-not-allowed opacity-60" : "",
      ].join(" ")}
    >
      <p className="font-medium">{person.fullName}</p>
      <dl className="mt-1 space-y-0.5 text-xs text-muted-foreground">
        {person.dateOfBirth && <dd>Born {formatDate(person.dateOfBirth)}</dd>}
        {person.phoneNumber && <dd>{person.phoneNumber}</dd>}
        {person.email && <dd>{person.email}</dd>}
        {holdings(person).length > 0 && (
          <dd className="pt-1 font-medium text-foreground">
            {holdings(person).join(" · ")}
          </dd>
        )}
      </dl>
      <p className="mt-2 text-xs font-medium">
        {keeping ? "Keeping this record" : "Keep this one instead"}
      </p>
    </button>
  );
}

export default function DuplicatePeoplePage() {
  const { data, isLoading, isError, refetch, isFetching } =
    useDuplicateSuggestions();
  const [merging, setMerging] = useState<{
    suggestion: DuplicateSuggestion;
    keepFirst: boolean;
  } | null>(null);

  const suggestions = data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Duplicate records
          </h1>
          <p className="max-w-2xl text-muted-foreground">
            Records that may describe the same person — a parent entered again
            when a second child joined, a teacher re-imported. Nothing is
            combined automatically: a household shares a phone number, so
            looking alike is a question rather than an answer.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => refetch()}
          disabled={isFetching}
          className="shrink-0"
        >
          {isFetching && <Loader2 className="mr-2 size-4 animate-spin" />}
          Check again
        </Button>
      </div>

      <Card>
        <CardHeader className="border-b border-border">
          <div className="flex items-center gap-2">
            <Users className="size-4 text-muted-foreground" />
            <span className="font-medium">
              {isLoading ? "Looking…" : `${suggestions.length} to review`}
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {isError && (
            <p className="px-6 py-12 text-center text-sm text-muted-foreground">
              These suggestions couldn&apos;t be loaded. Combining records needs
              its own permission.
            </p>
          )}

          {!isLoading && !isError && suggestions.length === 0 && (
            <p className="px-6 py-16 text-center text-sm text-muted-foreground">
              No records look like duplicates.
            </p>
          )}

          {suggestions.map((suggestion) => (
            <div
              key={`${suggestion.person.id}-${suggestion.other.id}`}
              className="space-y-3 border-b border-border px-6 py-4 last:border-0"
            >
              <p className="text-sm text-muted-foreground">
                Matched on {suggestion.reason}
              </p>

              <div className="flex flex-col gap-3 sm:flex-row">
                <PersonCard
                  person={suggestion.person}
                  keeping
                  onKeep={() => undefined}
                  disabled
                />
                <PersonCard
                  person={suggestion.other}
                  keeping={false}
                  onKeep={() => undefined}
                  disabled
                />
              </div>

              {suggestion.blockedReason ? (
                <p className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/5 px-3 py-2 text-sm">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
                  <span>
                    {suggestion.blockedReason} These are two different people,
                    or a problem combining them would hide rather than fix.
                  </span>
                </p>
              ) : (
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    onClick={() =>
                      setMerging({ suggestion, keepFirst: true })
                    }
                  >
                    Review and combine
                  </Button>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {merging && (
        <MergeDialog
          suggestion={merging.suggestion}
          onClose={() => setMerging(null)}
        />
      )}
    </div>
  );
}

function MergeDialog({
  suggestion,
  onClose,
}: {
  suggestion: DuplicateSuggestion;
  onClose: () => void;
}) {
  // Which record survives is the operator's call, and it matters: everything
  // pointing at the other one is repointed at this one.
  const [keepFirst, setKeepFirst] = useState(true);
  const [reason, setReason] = useState("");
  const merge = useMergePeople();

  const keep = keepFirst ? suggestion.person : suggestion.other;
  const absorb = keepFirst ? suggestion.other : suggestion.person;

  const combine = async () => {
    try {
      await merge.mutateAsync({
        keep: keep.id,
        absorb: absorb.id,
        reason: reason.trim() || undefined,
      });
      onClose();
    } catch {
      // The mutation's toast has said why; the dialog stays open so the
      // operator can keep the other record instead.
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl" onClose={onClose}>
        <DialogHeader>
          <DialogTitle>Combine these records</DialogTitle>
          <DialogDescription>
            Everything pointing at the absorbed record — children, fees,
            attendance, messages — is repointed at the one you keep. What was
            combined is written down first, so the decision can be understood
            later.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex flex-col gap-3 sm:flex-row">
            <PersonCard
              person={suggestion.person}
              keeping={keepFirst}
              onKeep={() => setKeepFirst(true)}
              disabled={merge.isPending}
            />
            <PersonCard
              person={suggestion.other}
              keeping={!keepFirst}
              onKeep={() => setKeepFirst(false)}
              disabled={merge.isPending}
            />
          </div>

          <p className="text-sm text-muted-foreground">
            Keeping <span className="font-medium text-foreground">{keep.fullName}</span>,
            absorbing <span className="font-medium text-foreground">{absorb.fullName}</span>.
          </p>

          <div className="space-y-2">
            <Label htmlFor="merge-reason">Why these are the same person</Label>
            <Textarea
              id="merge-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Kept with the merge record"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={merge.isPending}>
            Cancel
          </Button>
          <Button onClick={combine} disabled={merge.isPending}>
            {merge.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            Combine records
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
