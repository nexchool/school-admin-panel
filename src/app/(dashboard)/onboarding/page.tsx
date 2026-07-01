"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import {
  FileUp,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ArrowRight,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks";
import {
  schoolSetupService,
  type SeedPreview,
  type SeedApplyResult,
  type SeedEntitySummary,
} from "@/services/schoolSetupService";

const ENTITY_ORDER: Array<{ key: keyof SeedPreview["entities"]; label: string }> = [
  { key: "units", label: "Branches / Units" },
  { key: "programmes", label: "Programmes" },
  { key: "grades", label: "Grades" },
  { key: "subjects", label: "Subjects" },
  { key: "offerings", label: "Subject offerings" },
  { key: "classes", label: "Classes (sections)" },
];

function errMsg(e: unknown): string {
  if (e && typeof e === "object" && "message" in e) {
    const m = (e as { message?: unknown }).message;
    if (typeof m === "string" && m.trim()) return m;
  }
  return "Unexpected error. Please try again.";
}

export default function OnboardingPage() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission("school_setup.manage");

  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<SeedPreview | null>(null);
  const [result, setResult] = useState<SeedApplyResult | null>(null);

  const previewMut = useMutation({
    mutationFn: (f: File) => schoolSetupService.setup.seedPreview(f),
    onSuccess: (p) => {
      setPreview(p);
      setResult(null);
    },
  });
  const applyMut = useMutation({
    mutationFn: (f: File) => schoolSetupService.setup.seedApply(f),
    onSuccess: (r) => setResult(r),
  });

  if (!canManage) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Onboarding</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            You don&rsquo;t have permission to onboard schools.
          </p>
        </CardContent>
      </Card>
    );
  }

  const onPick = (f: File | null) => {
    setFile(f);
    setPreview(null);
    setResult(null);
    previewMut.reset();
    applyMut.reset();
  };

  // A subdomain mismatch is informational only — the upload always applies to
  // the tenant you're operating in, so it does not block Confirm & apply.
  const tenantMismatch = preview?.tenant?.matches === false;
  const canApply = !!file && !!preview && preview.valid && !applyMut.isPending;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">School Onboarding</h1>
        <p className="text-muted-foreground">
          Upload a school config (<code>.yaml</code> / <code>.json</code>), review
          what it will create, then apply it to the school you are operating in.
        </p>
      </div>

      {/* Step 1 — choose file */}
      <Card>
        <CardHeader>
          <CardTitle>1. Choose config file</CardTitle>
          <CardDescription>
            Branches, programmes, grades, academic year, subjects, offerings and
            classes. Re-running is safe — existing rows are skipped.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <FileUp className="size-5 text-muted-foreground" />
            <input
              ref={fileRef}
              type="file"
              accept=".yaml,.yml,.json,application/json,application/x-yaml,text/yaml"
              onChange={(e) => onPick(e.target.files?.[0] ?? null)}
              className="block w-full text-sm file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90"
            />
          </div>
          {file && (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm text-muted-foreground">{file.name}</span>
              <Button
                type="button"
                size="sm"
                onClick={() => file && previewMut.mutate(file)}
                disabled={previewMut.isPending}
              >
                {previewMut.isPending ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" /> Previewing…
                  </>
                ) : (
                  "Preview changes"
                )}
              </Button>
            </div>
          )}
          {previewMut.isError && (
            <p className="text-sm text-destructive">
              Could not preview: {errMsg(previewMut.error)}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Step 2 — review */}
      {preview && (
        <Card>
          <CardHeader>
            <CardTitle>2. Review</CardTitle>
            <CardDescription>
              Target school:{" "}
              <span className="font-medium">
                {preview.tenant.active_subdomain ?? "current"}
              </span>
              {preview.academic_year?.name && (
                <>
                  {" "}
                  · Academic year{" "}
                  <span className="font-medium">{preview.academic_year.name}</span>{" "}
                  {preview.academic_year.exists ? "(exists)" : "(new)"}
                </>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {tenantMismatch && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <span>
                  Heads up: this file is labeled for tenant{" "}
                  <b>{preview.tenant.subdomain}</b>, but it will be applied to the
                  school you&rsquo;re operating in:{" "}
                  <b>{preview.tenant.active_subdomain}</b>.
                </span>
              </div>
            )}

            {!preview.valid && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
                <p className="font-medium text-destructive">
                  Config has {preview.errors.length} problem(s):
                </p>
                <ul className="mt-1 list-disc pl-5 text-muted-foreground">
                  {preview.errors.slice(0, 12).map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="overflow-hidden rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Entity</th>
                    <th className="px-3 py-2 text-right font-medium">New</th>
                    <th className="px-3 py-2 text-right font-medium">Exists</th>
                    <th className="px-3 py-2 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {ENTITY_ORDER.map(({ key, label }) => {
                    const s = preview.entities[key] as SeedEntitySummary;
                    return (
                      <tr key={key} className="border-t">
                        <td className="px-3 py-2">{label}</td>
                        <td className="px-3 py-2 text-right font-medium text-emerald-700">
                          {s.new > 0 ? `+${s.new}` : "—"}
                        </td>
                        <td className="px-3 py-2 text-right text-muted-foreground">
                          {s.existing}
                        </td>
                        <td className="px-3 py-2 text-right">{s.total}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                onClick={() => file && applyMut.mutate(file)}
                disabled={!canApply}
              >
                {applyMut.isPending ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" /> Applying…
                  </>
                ) : (
                  "Confirm & apply"
                )}
              </Button>
              {!preview.valid && (
                <span className="text-xs text-muted-foreground">
                  Fix the config errors to enable apply.
                </span>
              )}
            </div>
            {applyMut.isError && (
              <p className="text-sm text-destructive">
                Apply failed: {errMsg(applyMut.error)}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 3 — result */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="size-5 text-emerald-600" /> Applied
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <ul className="space-y-1">
              <li>
                Classes created: <b>{result.classes.created}</b> (
                {result.classes.skipped} already existed)
              </li>
              <li>
                Subject links created: <b>{result.class_subjects.created}</b> (
                {result.class_subjects.skipped} already existed)
              </li>
              <li>
                School setup:{" "}
                <b
                  className={
                    result.setup_complete ? "text-emerald-700" : "text-amber-700"
                  }
                >
                  {result.setup_complete ? "complete ✓" : "still incomplete"}
                </b>
              </li>
            </ul>
            <Button asChild variant="outline" size="sm">
              <Link href="/classes">
                View classes <ArrowRight className="ml-1 size-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
