"use client";

import { useState } from "react";
import { CalendarRange, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { WizardShell } from "@/components/school-setup/wizard/WizardShell";
import {
  AcademicYearFormDialog,
  type AcademicYearFormValues,
} from "@/components/school-setup/forms/AcademicYearFormDialog";
import {
  useAcademicYears,
  useCreateAcademicYear,
} from "@/hooks/useAcademicYears";
import { useActiveAcademicYear } from "@/contexts/ActiveAcademicYearContext";

export default function AcademicYearPage() {
  const { data: years = [], isLoading } = useAcademicYears();
  const createMutation = useCreateAcademicYear();
  const { setAcademicYearId } = useActiveAcademicYear();

  const [formOpen, setFormOpen] = useState(false);

  const activeYear = years.find((y) => y.is_active) ?? null;
  const otherYears = years.filter((y) => !y.is_active);

  const handleFormSubmit = async (values: AcademicYearFormValues) => {
    const created = await createMutation.mutateAsync(values);
    toast.success("Academic year created");
    if (values.is_active) {
      setAcademicYearId(created.id);
    }
  };

  return (
    <>
      <WizardShell
        stepKey="academic-year"
        canContinue={years.some((y) => y.is_active)}
        onContinue={() => {}}
      >
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Set your school&apos;s active academic year.
            </p>
            <Button
              size="sm"
              onClick={() => setFormOpen(true)}
              className="gap-1.5"
            >
              <Plus className="size-4" />
              Create Academic Year
            </Button>
          </div>

          {isLoading ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Loading…
            </p>
          ) : (
            <>
              {/* Active year card */}
              {activeYear ? (
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Active Year
                  </p>
                  <Card className="border-primary/40 bg-primary/5">
                    <CardContent className="flex items-center justify-between gap-4 p-4">
                      <div className="flex items-center gap-3">
                        <CalendarRange className="size-5 text-primary" />
                        <div>
                          <p className="font-semibold">{activeYear.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {activeYear.start_date} — {activeYear.end_date}
                          </p>
                        </div>
                      </div>
                      <Badge variant="default">Active</Badge>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed p-8 text-center">
                  <CalendarRange className="mx-auto mb-2 size-8 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">
                    No active academic year. Create one to continue.
                  </p>
                </div>
              )}

              {/* Other years list */}
              {otherYears.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Other Years
                  </p>
                  <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full text-sm">
                      <thead className="border-b bg-muted/40">
                        <tr>
                          <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                            Name
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
                        </tr>
                      </thead>
                      <tbody>
                        {otherYears.map((year) => (
                          <tr
                            key={year.id}
                            className="border-b last:border-0 hover:bg-muted/20"
                          >
                            <td className="px-4 py-3 font-medium">
                              {year.name}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {year.start_date}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {year.end_date}
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant="outline">Inactive</Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </WizardShell>

      <AcademicYearFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleFormSubmit}
        saving={createMutation.isPending}
      />
    </>
  );
}
