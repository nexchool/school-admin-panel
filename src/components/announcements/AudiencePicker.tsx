"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useClasses } from "@/hooks/useClasses";
import { studentsService } from "@/services/studentsService";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/components/providers/AuthProvider";
import { cn } from "@/lib/utils";
import type { AudienceJson, AudienceRole, AudienceScope } from "@/types/announcement";

const ROLE_OPTIONS: { value: AudienceRole; label: string }[] = [
  { value: "admin", label: "Admins" },
  { value: "teacher", label: "Teachers" },
  { value: "student", label: "Students" },
  { value: "parent", label: "Parents" },
];

const SCOPE_OPTIONS: { value: AudienceScope; label: string }[] = [
  { value: "all", label: "Everyone" },
  { value: "roles", label: "By role" },
  { value: "classes", label: "By class" },
  { value: "students", label: "Specific students" },
];

interface Props {
  value: AudienceJson;
  onChange: (next: AudienceJson) => void;
  error?: string;
}

export function AudiencePicker({ value, onChange, error }: Props) {
  const { data: classes = [] } = useClasses();

  const setScope = (scope: AudienceScope) => {
    onChange({ scope });
  };

  const toggleRole = (role: AudienceRole) => {
    const current = value.roles ?? [];
    const next = current.includes(role)
      ? current.filter((r) => r !== role)
      : [...current, role];
    onChange({ ...value, scope: "roles", roles: next });
  };

  const toggleClass = (classId: string) => {
    const current = value.class_ids ?? [];
    const next = current.includes(classId)
      ? current.filter((c) => c !== classId)
      : [...current, classId];
    onChange({ ...value, scope: "classes", class_ids: next });
  };

  return (
    <div className="space-y-3">
      <Label>Audience</Label>
      <div className="flex flex-wrap gap-2">
        {SCOPE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setScope(opt.value)}
            className={cn(
              "rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
              value.scope === opt.value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {value.scope === "roles" && (
        <div className="grid grid-cols-2 gap-2 rounded-lg border border-border bg-muted/40 p-3 sm:grid-cols-4">
          {ROLE_OPTIONS.map((role) => {
            const checked = value.roles?.includes(role.value) ?? false;
            return (
              <label
                key={role.value}
                className="flex cursor-pointer items-center gap-2 text-sm"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleRole(role.value)}
                  className="size-4"
                />
                <span>{role.label}</span>
              </label>
            );
          })}
        </div>
      )}

      {value.scope === "classes" && (
        <div className="max-h-64 space-y-1 overflow-y-auto rounded-lg border border-border bg-muted/40 p-3">
          {classes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No classes available.</p>
          ) : (
            classes.map((c) => {
              const checked = value.class_ids?.includes(c.id) ?? false;
              return (
                <label key={c.id} className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleClass(c.id)}
                    className="size-4"
                  />
                  <span>{c.name}</span>
                </label>
              );
            })
          )}
        </div>
      )}

      {value.scope === "students" && (
        <StudentMultiSelect
          value={value.student_ids ?? []}
          onChange={(student_ids) =>
            onChange({ ...value, scope: "students", student_ids })
          }
        />
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

// ── Student multi-select ──────────────────────────────────────────────────────

function StudentMultiSelect({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { tenantId } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["students-picker", search, tenantId],
    queryFn: () =>
      studentsService.getStudents({
        search: search || undefined,
        page: 1,
        per_page: 50,
      }),
    enabled: !!tenantId && open,
  });

  const selectedNames = useMemo(() => {
    const items = data?.items ?? [];
    return value.map((id) => {
      const found = items.find((s) => s.id === id);
      return found?.name ?? id;
    });
  }, [data, value]);

  const toggle = (id: string) => {
    const next = value.includes(id)
      ? value.filter((s) => s !== id)
      : [...value, id];
    onChange(next);
  };

  return (
    <div className="space-y-2 rounded-lg border border-border bg-muted/40 p-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {value.length === 0
            ? "No students selected"
            : `${value.length} student${value.length === 1 ? "" : "s"} selected`}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOpen(true)}
        >
          Pick students
        </Button>
      </div>
      {selectedNames.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedNames.slice(0, 6).map((name, idx) => (
            <span
              key={idx}
              className="rounded-full bg-background px-2 py-0.5 text-xs text-foreground"
            >
              {name}
            </span>
          ))}
          {selectedNames.length > 6 && (
            <span className="text-xs text-muted-foreground">
              +{selectedNames.length - 6} more
            </span>
          )}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Select students</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Search students…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <p className="p-2 text-sm text-muted-foreground">Loading…</p>
            ) : (data?.items.length ?? 0) === 0 ? (
              <p className="p-2 text-sm text-muted-foreground">No students found.</p>
            ) : (
              data!.items.map((s) => {
                const checked = value.includes(s.id);
                return (
                  <label
                    key={s.id}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(s.id)}
                      className="size-4"
                    />
                    <span className="flex-1">{s.name}</span>
                    {s.class_name && (
                      <span className="text-xs text-muted-foreground">
                        {s.class_name}
                      </span>
                    )}
                  </label>
                );
              })
            )}
          </div>
          <DialogFooter>
            <Button type="button" onClick={() => setOpen(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
