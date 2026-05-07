"use client";

import { useState } from "react";
import { BookOpen, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { WizardShell } from "@/components/school-setup/wizard/WizardShell";
import {
  SubjectFormDialog,
  type SubjectFormValues,
} from "@/components/school-setup/forms/SubjectFormDialog";
import { TemplateDetailModal } from "@/components/school-setup/TemplateDetailModal";
import {
  useSubjects,
  useCreateSubject,
  useUpdateSubject,
  useDeleteSubject,
} from "@/hooks/useSubjects";
import { useTemplates, useApplySubjectOfferings } from "@/hooks/useSchoolSetup";
import { useActiveAcademicYear } from "@/contexts/ActiveAcademicYearContext";
import type { Subject } from "@/types/subject";

const SUBJECT_TYPE_LABELS: Record<string, string> = {
  core: "Core",
  elective: "Elective",
  activity: "Activity",
  other: "Other",
};

export default function SubjectsPage() {
  const { data: subjects = [], isLoading } = useSubjects();
  const { data: templatesResult } = useTemplates();
  const templates = templatesResult?.data ?? [];

  const createMutation = useCreateSubject();
  const updateMutation = useUpdateSubject();
  const deleteMutation = useDeleteSubject();
  const applyMutation = useApplySubjectOfferings();

  const { academicYearId } = useActiveAcademicYear();

  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Subject | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Subject | null>(null);
  const [templateModalId, setTemplateModalId] = useState<string | null>(null);

  // ── Handlers ────────────────────────────────────────────────────────

  const handleAddClick = () => {
    setEditTarget(null);
    setFormOpen(true);
  };

  const handleEditClick = (subject: Subject) => {
    setEditTarget(subject);
    setFormOpen(true);
  };

  const handleFormSubmit = async (values: SubjectFormValues) => {
    if (editTarget) {
      await updateMutation.mutateAsync({
        id: editTarget.id,
        input: {
          name: values.name,
          code: values.code,
          description: values.description,
        },
      });
      toast.success("Subject updated");
    } else {
      await createMutation.mutateAsync({
        name: values.name,
        code: values.code,
        description: values.description,
      });
      toast.success("Subject added");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    await deleteMutation.mutateAsync(deleteTarget.id);
    toast.success("Subject deleted");
    setDeleteTarget(null);
  };

  const handleApplyOfferings = async () => {
    if (!academicYearId) {
      toast.error("No active academic year. Please set one in Step 4.");
      return;
    }
    try {
      const result = await applyMutation.mutateAsync(academicYearId);
      const counts = result?.data;
      if (counts) {
        toast.success(
          `Applied: ${counts.created} created, ${counts.skipped} skipped`,
        );
      } else {
        toast.success("Subject offerings applied to all classes.");
      }
    } catch {
      toast.error("Failed to apply subject offerings.");
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  // ── Render ───────────────────────────────────────────────────────────

  return (
    <>
      <WizardShell
        stepKey="subjects"
        canContinue={subjects.length > 0}
        onContinue={() => {}}
      >
        <div className="space-y-8">
          <p className="text-sm text-muted-foreground">
            Configure subjects offered at your school.
          </p>

          {/* ── Section 1: Template picker ── */}
          {templates.length > 0 && (
            <section className="space-y-3">
              <div>
                <h2 className="text-sm font-semibold">
                  Start from a curriculum template
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Tap View to inspect, Use to load into your subjects.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className="flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-sm"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10">
                        <BookOpen className="size-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm leading-tight truncate">
                          {template.name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {template.board_code}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2 mt-auto">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="flex-1 text-xs"
                        onClick={() => setTemplateModalId(template.id)}
                      >
                        View
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        className="flex-1 text-xs"
                        onClick={() => setTemplateModalId(template.id)}
                      >
                        Use
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── Section 2: Subjects table ── */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Your Subjects</h2>
              <Button size="sm" onClick={handleAddClick} className="gap-1.5">
                <Plus className="size-4" />
                Add Subject
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
                        Type
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                        Description
                      </th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {subjects.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-4 py-8 text-center text-muted-foreground"
                        >
                          No subjects yet. Add one above or use a template to
                          get started.
                        </td>
                      </tr>
                    ) : (
                      subjects.map((subject) => (
                        <tr
                          key={subject.id}
                          className="border-b last:border-0 hover:bg-muted/20"
                        >
                          <td className="px-4 py-3 font-medium">
                            {subject.name}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                            {subject.code ?? "—"}
                          </td>
                          <td className="px-4 py-3">
                            {subject.subject_type ? (
                              <Badge variant="outline">
                                {SUBJECT_TYPE_LABELS[subject.subject_type] ??
                                  subject.subject_type}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">
                            {subject.description ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditClick(subject)}
                                aria-label={`Edit ${subject.name}`}
                              >
                                <Pencil className="size-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeleteTarget(subject)}
                                aria-label={`Delete ${subject.name}`}
                              >
                                <Trash2 className="size-4 text-destructive" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* ── Section 3: Apply to classes ── */}
          {subjects.length > 0 && (
            <section className="rounded-lg border bg-muted/20 p-4 space-y-2">
              <h2 className="text-sm font-semibold">Apply to Classes</h2>
              <p className="text-xs text-muted-foreground">
                Link all subjects to every class in the current academic year.
                Already-linked pairs are skipped.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                disabled={!academicYearId || applyMutation.isPending}
                onClick={handleApplyOfferings}
              >
                {applyMutation.isPending
                  ? "Applying…"
                  : "Apply subject offerings to all classes"}
              </Button>
              {!academicYearId && (
                <p className="text-xs text-amber-600">
                  Set an active academic year in Step 4 to enable this.
                </p>
              )}
            </section>
          )}
        </div>
      </WizardShell>

      {/* ── Dialogs ── */}
      <SubjectFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        defaultValues={editTarget}
        onSubmit={handleFormSubmit}
        saving={isSaving}
      />

      {templateModalId && (
        <TemplateDetailModal
          templateId={templateModalId}
          onClose={() => setTemplateModalId(null)}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete subject"
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
