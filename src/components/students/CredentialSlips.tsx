"use client";

import { Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { IssuedCredential } from "@/services/studentCredentialsService";

/**
 * The slips a school cuts up and hands out.
 *
 * These passwords exist in this component's props and nowhere else — not in
 * the query cache, not in the database, not in an audit record. Once this
 * view is dismissed, nobody can recover them, which is why the warning is
 * part of the design rather than a footnote: an operator who navigates away
 * before printing has to issue new passwords for the whole class.
 *
 * Printing is the browser's own, driven by `print:` classes that hide the
 * rest of the page. No PDF service, no server round trip — the slips are
 * already on screen, and a school that prints them wants exactly what it can
 * see.
 */
export function CredentialSlips({
  credentials,
  schoolName,
  nameFor,
  onDone,
}: {
  credentials: IssuedCredential[];
  schoolName?: string | null;
  /** How to title a slip. Falls back to the admission number. */
  nameFor?: (studentId: string) => string | undefined;
  onDone?: () => void;
}) {
  if (credentials.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <p className="text-sm font-medium text-amber-700 dark:text-amber-500">
          Print or write these down now — they cannot be shown again.
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => window.print()}
          >
            <Printer className="size-4" />
            Print slips
          </Button>
          {onDone && (
            <Button type="button" size="sm" onClick={onDone}>
              Done
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 print:grid-cols-2">
        {credentials.map((credential) => (
          <div
            key={credential.student_id}
            className="break-inside-avoid rounded-md border border-border p-4 text-sm"
          >
            {schoolName && (
              <p className="text-xs text-muted-foreground">{schoolName}</p>
            )}
            <p className="font-medium">
              {nameFor?.(credential.student_id) ??
                credential.admission_number ??
                "Student"}
            </p>
            <dl className="mt-3 space-y-1">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Admission number</dt>
                <dd className="font-mono">{credential.admission_number ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Password</dt>
                <dd className="font-mono font-semibold tracking-wide">
                  {credential.password}
                </dd>
              </div>
            </dl>
            {credential.must_change && (
              <p className="mt-3 text-xs text-muted-foreground">
                You will be asked to choose your own password when you sign in.
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
