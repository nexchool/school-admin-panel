"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { WizardShell } from "@/components/school-setup/wizard/WizardShell";
import {
  TermFormDialog,
  type TermFormValues,
} from "@/components/school-setup/forms/TermFormDialog";
import {
  useTerms,
  useCreateTerm,
  useUpdateTerm,
  useDeleteTerm,
} from "@/hooks/useTerms";
import { useAcademicYears } from "@/hooks/useAcademicYears";
import { useActiveAcademicYear } from "@/contexts/ActiveAcademicYearContext";
import type { AcademicTerm } from "@/services/academicTermsService";

type TermPreset = {
  label: string;
  terms: Array<{ name: string; sequence: number; start_date: string; end_date: string }>;
};

const TERM_PRESETS: TermPreset[] = [
  {
    label: "2 Terms",
    terms: [
      { name: "Term 1", sequence: 1, start_date: "2025-04-01", end_date: "2025-09-30" },
      { name: "Term 2", sequence: 2, start_date: "2025-10-01", end_date: "2026-03-31" },
    ],
  },
  {
    label: "3 Terms",
    terms: [
      { name: "Term 1", sequence: 1, start_date: "2025-04-01", end_date: "2025-07-31" },
      { name: "Term 2", sequence: 2, start_date: "2025-08-01", end_date: "2025-11-30" },
      { name: "Term 3", sequence: 3, start_date: "2025-12-01", end_date: "2026-03-31" },
    ],
  },
];

export default function TermsPage() {
  const { academicYearId } = useActiveAcademicYear();
  const { data: terms = [], isLoading } = useTerms(academicYearId ?? undefined);
  const { data: academicYears = [] } = useAcademicYears();
  const activeYearName =
    academicYears.find((y) => y.id === academicYearId)?.name ?? null;

  const createMutation = useCreateTerm();
  const updateMutation = useUpdateTerm();
  const deleteMutation = useDeleteTerm();

  const handleApplyPreset = async (preset: TermPreset) => {
    if (!academicYearId) {
      toast.error("No active academic year. Set one in Step 4 first.");
      return;
    }
    for (const t of preset.terms) {
      try {
        await createMutation.mutateAsync({
          academic_year_id: academicYearId,
          name: t.name,
          code: null,
          sequence: t.sequence,
          start_date: t.start_date,
          end_date: t.end_date,
          is_active: t.sequence === 1,
        });
      } catch {
        toast.error(`Failed to create ${t.name}`);
        return;
      }
    }
    toast.success(`${preset.label} applied`);
  };

  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AcademicTerm | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AcademicTerm | null>(null);

  // ── Handlers ────────────────────────────────────────────────────────

  const handleAddClick = () => {
    setEditTarget(null);
    setFormOpen(true);
  };

  const handleEditClick = (term: AcademicTerm) => {
    setEditTarget(term);
    setFormOpen(true);
  };

  const handleFormSubmit = async (values: TermFormValues) => {
    if (editTarget) {
      await updateMutation.mutateAsync({
        id: editTarget.id,
        data: {
          name: values.name,
          code: values.code ?? null,
          sequence: values.sequence,
          start_date: values.start_date,
          end_date: values.end_date,
          is_active: values.is_active,
        },
      });
      toast.success("Term updated");
    } else {
      if (!academicYearId) {
        toast.error("No active academic year. Please set one in Step 4.");
        return;
      }
      await createMutation.mutateAsync({
        academic_year_id: academicYearId,
        name: values.name,
        code: values.code ?? null,
        sequence: values.sequence,
        start_date: values.start_date,
        end_date: values.end_date,
        is_active: values.is_active,
      });
      toast.success("Term added");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    await deleteMutation.mutateAsync(deleteTarget.id);
    toast.success("Term deleted");
    setDeleteTarget(null);
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  // ── Render ───────────────────────────────────────────────────────────

  return (
    <>
      <WizardShell
        stepKey="terms"
        canContinue={true}
        onContinue={() => {}}
      >
        <div className="space-y-6">
          {/* Optional notice */}
          <div className="rounded-md border border-dashed bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">Optional step.</span>{" "}
            You can skip terms and come back later. Many schools only configure terms when
            they need term-based reports or fee splits.
          </div>

          {/* Quick presets — only show if no terms exist yet */}
          {terms.length === 0 && academicYearId && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Quick presets</p>
              <div className="flex gap-2 flex-wrap">
                {TERM_PRESETS.map((preset) => (
                  <Button
                    key={preset.label}
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={createMutation.isPending}
                    onClick={() => handleApplyPreset(preset)}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <section className="space-y-3">
            <div className="mb-3 flex items-center justify-between text-sm text-muted-foreground">
              <p>
                Showing terms for{" "}
                <span className="font-medium text-foreground">
                  {activeYearName ?? "no active year"}
                </span>
              </p>
              {!academicYearId && (
                <p className="text-amber-600">Set an active academic year in Step 4 first.</p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Terms</h2>
              <Button
                size="sm"
                onClick={handleAddClick}
                className="gap-1.5"
                disabled={!academicYearId}
              >
                <Plus className="size-4" />
                Add Term
              </Button>
            </div>

            {isLoading ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Loading…
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/40">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                        Name
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                        Code
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                        Sequence
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                        Academic Year
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                        Start
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                        End
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                        Status
                      </th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {terms.length === 0 ? (
                      <tr>
                        <td
                          colSpan={8}
                          className="px-4 py-8 text-center text-muted-foreground"
                        >
                          No terms yet. Add one above to split your academic
                          year into terms.
                        </td>
                      </tr>
                    ) : (
                      terms.map((term) => {
                        const termYear = academicYears.find(
                          (y) => y.id === term.academic_year_id,
                        );
                        const isOtherYear =
                          academicYearId && term.academic_year_id !== academicYearId;
                        return (
                          <tr
                            key={term.id}
                            className="border-b last:border-0 hover:bg-muted/20"
                          >
                            <td className="px-4 py-3 font-medium">{term.name}</td>
                            <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                              {term.code ?? "—"}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {term.sequence}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              <span>{termYear?.name ?? "—"}</span>
                              {isOtherYear && (
                                <Badge
                                  variant="outline"
                                  className="ml-1.5 text-xs"
                                >
                                  other year
                                </Badge>
                              )}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {term.start_date}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {term.end_date}
                            </td>
                            <td className="px-4 py-3">
                              <Badge
                                variant={term.is_active ? "default" : "outline"}
                              >
                                {term.is_active ? "Active" : "Inactive"}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditClick(term)}
                                  aria-label={`Edit ${term.name}`}
                                >
                                  <Pencil className="size-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setDeleteTarget(term)}
                                  aria-label={`Delete ${term.name}`}
                                >
                                  <Trash2 className="size-4 text-destructive" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </WizardShell>

      {/* ── Dialogs ── */}
      <TermFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        defaultValues={editTarget}
        defaultSequence={terms.length + 1}
        activeYearName={activeYearName}
        onSubmit={handleFormSubmit}
        saving={isSaving}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete term"
        description={
          deleteTarget
            ? `Are you sure you want to delete "${deleteTarget.name}"? This cannot be undone.`
            : undefined
        }
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
        loading={deleteMutation.isPending}
      />
    </>
  );
}
