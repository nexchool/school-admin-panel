"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAcademicYears } from "@/hooks/useAcademicYears";
import { useAuth } from "@/hooks";
import { useCreateTerm, useDeleteTerm, useTerms } from "@/hooks/useTerms";
import { ApiException } from "@/services/api";

export function TermsList() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission("class.manage");

  const { data: years = [] } = useAcademicYears(false);
  const [yearIdRaw, setYearId] = useState<string>("");
  const defaultYear = years.find((y) => y.is_active !== false) ?? years[0];
  const yearId = yearIdRaw || (defaultYear ? defaultYear.id : "");

  const { data: terms = [], isLoading } = useTerms(yearId || undefined);
  const createMut = useCreateTerm();
  const deleteMut = useDeleteTerm();

  const sortedTerms = useMemo(
    () => [...terms].sort((a, b) => a.sequence - b.sequence),
    [terms],
  );

  const [name, setName] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  const onAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!yearId) return toast.error("Pick an academic year.");
    if (!name.trim()) return toast.error("Term name is required.");
    if (!start || !end) return toast.error("Both dates are required.");
    if (end < start) return toast.error("End date must be on or after start.");

    createMut.mutate(
      {
        academic_year_id: yearId,
        name: name.trim(),
        start_date: start,
        end_date: end,
        sequence: sortedTerms.length + 1,
      },
      {
        onSuccess: () => {
          toast.success("Term added.");
          setName("");
          setStart("");
          setEnd("");
        },
        onError: (e) =>
          toast.error(
            e instanceof ApiException
              ? e.message
              : e instanceof Error
                ? e.message
                : "Could not add term.",
          ),
      },
    );
  };

  const onDelete = (id: string, label: string) => {
    if (!window.confirm(`Delete term “${label}”?`)) return;
    deleteMut.mutate(id, {
      onSuccess: () => toast.success("Term deleted."),
      onError: (e) =>
        toast.error(
          e instanceof ApiException
            ? e.message
            : e instanceof Error
              ? e.message
              : "Delete failed.",
        ),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Button asChild variant="outline" size="sm" className="gap-1">
          <Link href="/school-setup">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to setup
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Academic terms</CardTitle>
          <CardDescription>
            Optional: split each academic year into terms (Term 1, Term 2, …).
            You can skip this step.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {years.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Add an academic year before creating terms.
            </p>
          ) : (
            <>
              <div className="space-y-1">
                <Label>Academic year</Label>
                <Select value={yearId} onValueChange={setYearId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((y) => (
                      <SelectItem key={y.id} value={y.id}>
                        {y.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {canManage ? (
                <form
                  onSubmit={onAdd}
                  className="grid grid-cols-1 gap-2 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-end"
                >
                  <div className="space-y-1">
                    <Label htmlFor="term-name">Name</Label>
                    <Input
                      id="term-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Term 1"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="term-start">Start</Label>
                    <Input
                      id="term-start"
                      type="date"
                      value={start}
                      onChange={(e) => setStart(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="term-end">End</Label>
                    <Input
                      id="term-end"
                      type="date"
                      value={end}
                      onChange={(e) => setEnd(e.target.value)}
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={createMut.isPending}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add
                  </Button>
                </form>
              ) : null}

              {isLoading ? (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading…
                </p>
              ) : sortedTerms.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No terms for the selected year.
                </p>
              ) : (
                <ul className="divide-y rounded-md border">
                  {sortedTerms.map((t) => (
                    <li
                      key={t.id}
                      className="flex items-center justify-between gap-3 px-4 py-2"
                    >
                      <div>
                        <p className="font-medium">{t.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {t.start_date} → {t.end_date}
                        </p>
                      </div>
                      {canManage ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => onDelete(t.id, t.name)}
                          disabled={deleteMut.isPending}
                          aria-label={`Delete term ${t.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
