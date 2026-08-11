"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Plus } from "lucide-react";

import {
  CreateSectionModal,
  type SectionContext,
} from "@/components/classes/CreateSectionModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { useAuth } from "@/hooks";
import { useClasses } from "@/hooks/useClasses";
import { useGrades } from "@/hooks/useGrades";
import { gradeLabel } from "@/lib/gradeLevel";
import type { ClassItem } from "@/types/class";

/**
 * What this grade actually runs, this year, at this campus.
 *
 * The one question the Grades list cannot answer: a grade is a level, and a
 * level on its own tells an administrator nothing about whether it is being
 * taught, on which programmes, or how many sections deep. Both are answered by
 * classes the app has already loaded — this page groups them, it does not
 * introduce a hierarchy. **A Section is not an entity**; it is the section
 * letter of a Class, which stays the only row anything is written to.
 *
 * Campus and academic year come from the header, the same scope the Classes
 * page and the pickers use, so this never shows a programme the administrator
 * is not currently looking at.
 */
export default function GradeDetailPage() {
  const params = useParams<{ id: string }>();
  const gradeId = params?.id ?? "";
  const router = useRouter();
  const { hasPermission } = useAuth();
  const canCreate = hasPermission("class.create");

  const { data: grades = [], isLoading: gradesLoading } = useGrades();
  const { data: classes = [], isLoading: classesLoading } = useClasses();

  const grade = grades.find((g) => g.id === gradeId);

  // Grouped by programme because that is the choice a school actually makes:
  // "Grade 1 on GSEB English" and "Grade 1 on GSEB Gujarati" are different
  // cohorts that happen to share a level.
  const programmes = useMemo(() => {
    const groups = new Map<
      string,
      { id: string; name: string; sections: ClassItem[] }
    >();
    for (const row of classes) {
      if (row.grade_id !== gradeId) continue;
      const id = row.programme_id ?? "none";
      const existing = groups.get(id);
      if (existing) existing.sections.push(row);
      else
        groups.set(id, {
          id,
          name: row.programme_name ?? "No programme",
          sections: [row],
        });
    }
    for (const group of groups.values()) {
      group.sections.sort((a, b) =>
        (a.section ?? "").localeCompare(b.section ?? ""),
      );
    }
    return [...groups.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [classes, gradeId]);

  const [addingTo, setAddingTo] = useState<SectionContext | null>(null);
  const isLoading = gradesLoading || classesLoading;
  const totalSections = programmes.reduce((n, p) => n + p.sections.length, 0);

  if (!isLoading && !grade) {
    return (
      <div className="space-y-6">
        <PageHeader title="Grade not found" />
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            That grade no longer exists.{" "}
            <Link href="/grades" className="underline underline-offset-4">
              Back to Grades
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2 gap-2 text-muted-foreground"
        onClick={() => router.push("/grades")}
      >
        <ArrowLeft className="size-4" />
        Grades
      </Button>

      <PageHeader
        title={grade ? gradeLabel(grade.name) : "Grade"}
        description={
          isLoading
            ? undefined
            : totalSections === 0
              ? "No classes run in this grade for the selected campus and academic year."
              : `${totalSections} class${totalSections === 1 ? "" : "es"} across ${programmes.length} programme${programmes.length === 1 ? "" : "s"}, for the selected campus and academic year.`
        }
      />

      {isLoading ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Loading…
          </CardContent>
        </Card>
      ) : programmes.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nothing runs here yet</CardTitle>
            <p className="text-sm text-muted-foreground">
              Classes are created from the Classes page, where you choose the
              campus, programme and academic year they belong to.
            </p>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => router.push("/classes")}>
              Go to Classes
            </Button>
          </CardContent>
        </Card>
      ) : (
        programmes.map((programme) => (
          <Card key={programme.id}>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-base">{programme.name}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {programme.sections.length} section
                  {programme.sections.length === 1 ? "" : "s"}
                </p>
              </div>
              {canCreate && programme.id !== "none" && grade ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() =>
                    setAddingTo({
                      gradeId: grade.id,
                      gradeName: grade.name,
                      programmeId: programme.id,
                      programmeName: programme.name,
                    })
                  }
                >
                  <Plus className="size-4" />
                  Add section
                </Button>
              ) : null}
            </CardHeader>
            <CardContent>
              <ul className="divide-y rounded-md border">
                {programme.sections.map((section) => (
                  <li key={section.id}>
                    <Link
                      href={`/classes/${section.id}`}
                      className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
                    >
                      <div className="min-w-0">
                        <p className="font-medium">
                          Section {section.section ?? "—"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {[section.medium_name, section.school_unit_name]
                            .filter(Boolean)
                            .join(" · ") || "—"}
                        </p>
                      </div>
                      <span className="shrink-0 text-sm text-muted-foreground">
                        {section.student_count ?? 0} student
                        {section.student_count === 1 ? "" : "s"}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))
      )}

      <CreateSectionModal
        open={!!addingTo}
        onOpenChange={(next) => !next && setAddingTo(null)}
        onCreated={(classId) => router.push(`/classes/${classId}`)}
        context={addingTo ?? undefined}
      />
    </div>
  );
}
