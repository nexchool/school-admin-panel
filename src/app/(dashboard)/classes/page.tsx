"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useClasses } from "@/hooks/useClasses";
import { useAuth } from "@/hooks";
import type { ClassItem } from "@/types/class";
import { Plus, BookOpen } from "lucide-react";

interface ProgrammeBucket {
  programme_key: string;
  programme_name: string;
  grades: GradeBucket[];
}

interface GradeBucket {
  grade_key: string;
  grade_name: string;
  classes: ClassItem[];
}

interface UnitBucket {
  unit_key: string;
  unit_name: string;
  programmes: ProgrammeBucket[];
}

/**
 * Group classes as: School Unit → Programme → Grade → Sections.
 * Buckets fall back to "Unassigned" when older rows don't carry the
 * structural FKs yet (legacy data from before the multi-school migration).
 */
function groupClasses(rows: ClassItem[]): UnitBucket[] {
  const units = new Map<string, UnitBucket>();

  const unitKeyOf = (c: ClassItem) => c.school_unit_id ?? "_unassigned_unit";
  const unitNameOf = (c: ClassItem) =>
    c.school_unit_name ?? "Unassigned (legacy)";
  const progKeyOf = (c: ClassItem) => c.programme_id ?? "_unassigned_prog";
  const progNameOf = (c: ClassItem) => c.programme_name ?? "Unassigned";
  const gradeKeyOf = (c: ClassItem) =>
    c.grade_id ?? `legacy:${c.name ?? c.grade_level ?? "—"}`;
  const gradeNameOf = (c: ClassItem) =>
    c.grade_name ??
    c.name ??
    (c.grade_level != null ? `Grade ${c.grade_level}` : "—");

  for (const c of rows) {
    const uk = unitKeyOf(c);
    let unit = units.get(uk);
    if (!unit) {
      unit = { unit_key: uk, unit_name: unitNameOf(c), programmes: [] };
      units.set(uk, unit);
    }

    const pk = progKeyOf(c);
    let prog = unit.programmes.find((p) => p.programme_key === pk);
    if (!prog) {
      prog = { programme_key: pk, programme_name: progNameOf(c), grades: [] };
      unit.programmes.push(prog);
    }

    const gk = gradeKeyOf(c);
    let grade = prog.grades.find((g) => g.grade_key === gk);
    if (!grade) {
      grade = { grade_key: gk, grade_name: gradeNameOf(c), classes: [] };
      prog.grades.push(grade);
    }
    grade.classes.push(c);
  }

  // Stable ordering inside each bucket.
  for (const u of units.values()) {
    for (const p of u.programmes) {
      p.grades.sort((a, b) => a.grade_name.localeCompare(b.grade_name));
      for (const g of p.grades) {
        g.classes.sort((a, b) =>
          (a.section ?? "").localeCompare(b.section ?? ""),
        );
      }
    }
    u.programmes.sort((a, b) =>
      a.programme_name.localeCompare(b.programme_name),
    );
  }

  return Array.from(units.values()).sort((a, b) =>
    a.unit_name.localeCompare(b.unit_name),
  );
}

export default function ClassesPage() {
  const router = useRouter();
  const { hasPermission } = useAuth();
  const canCreate = hasPermission("class.create");

  const { data: classes = [], isLoading } = useClasses();
  const grouped = useMemo(() => groupClasses(classes), [classes]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Classes</h1>
          <p className="text-muted-foreground">
            Read-only list grouped by School Unit → Programme → Grade. Use the
            guided builder to add new sections.
          </p>
        </div>
        {canCreate && (
          <Button asChild className="gap-2">
            <Link href="/school-setup">
              <Plus className="size-4" />
              Add classes
            </Link>
          </Button>
        )}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : grouped.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No classes yet</CardTitle>
            <CardDescription>
              Use School Setup to add your first batch of classes via the
              guided builder.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/school-setup">Open School Setup</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {grouped.map((unit) => (
            <section key={unit.unit_key} className="space-y-3">
              <h2 className="text-lg font-semibold">{unit.unit_name}</h2>
              {unit.programmes.map((prog) => (
                <Card key={`${unit.unit_key}:${prog.programme_key}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-muted-foreground" />
                      <CardTitle className="text-base">
                        {prog.programme_name}
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {prog.grades.map((grade) => (
                      <div
                        key={grade.grade_key}
                        className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/30 px-3 py-2"
                      >
                        <span className="text-sm font-medium">
                          {grade.grade_name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          →
                        </span>
                        {grade.classes.map((cls) => (
                          <button
                            key={cls.id}
                            type="button"
                            onClick={() =>
                              router.push(`/classes/${cls.id}`)
                            }
                            className="rounded-md border bg-background px-2 py-1 text-xs font-medium hover:bg-muted"
                          >
                            {cls.section ?? cls.name ?? "—"}
                            {typeof cls.student_count === "number" ? (
                              <span className="ml-1 text-muted-foreground">
                                · {cls.student_count}
                              </span>
                            ) : null}
                          </button>
                        ))}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
