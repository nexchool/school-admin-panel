"use client";

import { useMemo, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  PASSWORD_MIN_LENGTH,
  type ModuleLevel,
  type SubAdmin,
  type SubAdminModuleCatalogEntry,
  type SubAdminModuleSelection,
} from "@/services/subAdminsService";
import type { SchoolUnit } from "@/services/schoolUnitsService";

// ---------------------------------------------------------------------------
// Labels for levels / toggles (display only — keys are the contract)
// ---------------------------------------------------------------------------

const LEVEL_LABELS: Record<ModuleLevel, string> = {
  none: "None",
  view: "View",
  edit: "Edit",
  operate: "Operate",
  manage: "Manage",
};

const TOGGLE_LABELS: Record<string, string> = {
  delete: "Allow delete",
  refund: "Allow refund",
  manage: "Full access (manage)",
};

// ---------------------------------------------------------------------------
// Form schema
// ---------------------------------------------------------------------------

/**
 * The module matrix is held outside RHF as plain state (it is keyed by module
 * and easier to manage imperatively). RHF + Zod cover the scalar fields; the
 * "at least one module granted" rule is validated on submit.
 */
const baseSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email"),
});

const createSchema = baseSchema
  .extend({
    password: z
      .string()
      .min(
        PASSWORD_MIN_LENGTH,
        `Password must be at least ${PASSWORD_MIN_LENGTH} characters`
      ),
    confirmPassword: z.string().min(1, "Confirm the password"),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

type CreateValues = z.infer<typeof createSchema>;
type EditValues = z.infer<typeof baseSchema>;
type FormValues = CreateValues & Partial<EditValues>;

// ---------------------------------------------------------------------------
// Matrix state
// ---------------------------------------------------------------------------

export type ModuleState = {
  level: ModuleLevel;
  delete: boolean;
  refund: boolean;
  manage: boolean;
};

export type MatrixState = Record<string, ModuleState>;

export function emptyMatrix(catalog: SubAdminModuleCatalogEntry[]): MatrixState {
  const state: MatrixState = {};
  for (const mod of catalog) {
    state[mod.key] = { level: "none", delete: false, refund: false, manage: false };
  }
  return state;
}

export function matrixFromSubAdmin(
  catalog: SubAdminModuleCatalogEntry[],
  subAdmin: SubAdmin
): MatrixState {
  const state = emptyMatrix(catalog);
  for (const granted of subAdmin.modules) {
    if (!state[granted.key]) continue;
    state[granted.key] = {
      level: granted.level,
      delete: granted.delete,
      refund: granted.refund,
      manage: granted.manage,
    };
  }
  return state;
}

export function matrixToSelection(
  catalog: SubAdminModuleCatalogEntry[],
  matrix: MatrixState
): SubAdminModuleSelection[] {
  const selection: SubAdminModuleSelection[] = [];
  for (const mod of catalog) {
    const state = matrix[mod.key];
    if (!state) continue;
    const hasToggle = state.delete || state.refund || state.manage;
    if (state.level === "none" && !hasToggle) continue;
    const item: SubAdminModuleSelection = { key: mod.key, level: state.level };
    if (mod.toggles.includes("delete") && state.delete) item.delete = true;
    if (mod.toggles.includes("refund") && state.refund) item.refund = true;
    if (mod.toggles.includes("manage") && state.manage) item.manage = true;
    selection.push(item);
  }
  return selection;
}

export function selectionGrantsAnything(
  selection: SubAdminModuleSelection[]
): boolean {
  return selection.some(
    (s) => s.level !== "none" || s.delete || s.refund || s.manage
  );
}

// ---------------------------------------------------------------------------
// Branch-access pure helpers (mirror server/modules/sub_admins/catalog.py)
// ---------------------------------------------------------------------------

/** "all" = unrestricted (all branches); "specific" = a fixed branch set. */
export type BranchMode = "all" | "specific";

/**
 * Module keys disabled in the matrix for the given branch mode.
 *
 * In "specific" mode a branch-restricted sub-admin may only manage
 * branch-scoped modules, so every non-branch-aware module is disabled. In "all"
 * mode nothing is disabled. The branch-aware flag comes from the catalog
 * (server step 0) — never hardcode the module list here.
 */
export function disabledModuleKeys(
  catalog: SubAdminModuleCatalogEntry[],
  mode: BranchMode
): Set<string> {
  if (mode === "all") return new Set();
  return new Set(catalog.filter((m) => !m.branch_aware).map((m) => m.key));
}

/**
 * Validate the branch-access selection, mirroring the backend 422 rules so the
 * user gets inline errors instead of a server round-trip:
 *   - "specific" requires ≥1 branch.
 *   - "specific" forbids granting any non-branch-aware module.
 *   - "all" allows any module and ignores branch selection.
 *
 * Returns null when valid, else a human-readable message.
 */
export function validateBranchSelection(
  catalog: SubAdminModuleCatalogEntry[],
  mode: BranchMode,
  branchUnitIds: string[],
  selection: SubAdminModuleSelection[]
): string | null {
  if (mode === "all") return null;
  if (branchUnitIds.length === 0) {
    return "Select at least one branch for a branch-restricted sub-admin.";
  }
  const nonBranchAware = disabledModuleKeys(catalog, "specific");
  const granted = selection
    .filter((s) => s.level !== "none" || s.delete || s.refund || s.manage)
    .map((s) => s.key);
  const offenders = granted.filter((key) => nonBranchAware.has(key));
  if (offenders.length > 0) {
    const labels = offenders.map(
      (key) => catalog.find((m) => m.key === key)?.label ?? key
    );
    return `Branch-restricted admins can only manage branch-scoped modules. Remove: ${labels.join(", ")}.`;
  }
  return null;
}

/** Resolve the initial branch mode for a sub-admin (edit pre-population). */
export function branchModeFromSubAdmin(subAdmin?: SubAdmin | null): BranchMode {
  return subAdmin && subAdmin.branch_unit_ids.length > 0 ? "specific" : "all";
}

// ---------------------------------------------------------------------------
// Module matrix sub-component
// ---------------------------------------------------------------------------

function ModulePermissionMatrix({
  catalog,
  matrix,
  disabledKeys,
  onChange,
}: {
  catalog: SubAdminModuleCatalogEntry[];
  matrix: MatrixState;
  /** Module keys locked because the branch mode forbids granting them. */
  disabledKeys: Set<string>;
  onChange: (key: string, next: ModuleState) => void;
}) {
  return (
    <div className="space-y-3">
      {catalog.map((mod) => {
        const state = matrix[mod.key];
        if (!state) return null;
        const moduleDisabled = disabledKeys.has(mod.key);
        const levelOptions: ModuleLevel[] = ["none", ...mod.levels];
        return (
          <div
            key={mod.key}
            className={
              moduleDisabled
                ? "rounded-lg border border-dashed border-border bg-muted/40 p-3 opacity-60"
                : "rounded-lg border border-border p-3"
            }
            aria-disabled={moduleDisabled}
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-sm font-medium">
                {mod.label}
                {moduleDisabled && (
                  <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[10px] font-normal uppercase tracking-wide text-muted-foreground">
                    Not branch-scoped
                  </span>
                )}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {levelOptions.map((level) => {
                  const active = state.level === level;
                  return (
                    <button
                      key={level}
                      type="button"
                      disabled={moduleDisabled}
                      onClick={() => onChange(mod.key, { ...state, level })}
                      className={
                        active
                          ? "rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground disabled:opacity-50"
                          : "rounded-md border border-input bg-background px-2.5 py-1 text-xs text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:hover:bg-background"
                      }
                      aria-pressed={active}
                    >
                      {LEVEL_LABELS[level]}
                    </button>
                  );
                })}
              </div>
            </div>

            {mod.toggles.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-4 border-t border-border pt-2">
                {mod.toggles.map((toggle) => {
                  const checked = Boolean(
                    state[toggle as keyof ModuleState]
                  );
                  // Toggles only meaningful once at least "view" is granted,
                  // and never on a module disabled by branch mode.
                  const disabled = moduleDisabled || state.level === "none";
                  return (
                    <label
                      key={toggle}
                      className="flex items-center gap-2 text-xs text-foreground"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={disabled}
                        onChange={(e) =>
                          onChange(mod.key, {
                            ...state,
                            [toggle]: e.target.checked,
                          } as ModuleState)
                        }
                        className="size-4 rounded border-input"
                      />
                      <span className={disabled ? "text-muted-foreground" : ""}>
                        {TOGGLE_LABELS[toggle] ?? toggle}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main modal
// ---------------------------------------------------------------------------

interface SubAdminFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When set, the modal is in EDIT mode (no password fields). */
  subAdmin?: SubAdmin | null;
  catalog: SubAdminModuleCatalogEntry[];
  isCatalogLoading?: boolean;
  /**
   * Branches selectable for "Specific branches" mode. Already limited to the
   * acting admin's allowed units by the backend (`GET /api/school-units/`).
   */
  units?: SchoolUnit[];
  isUnitsLoading?: boolean;
  saving?: boolean;
  onSubmit: (payload: {
    name: string;
    email: string;
    password?: string;
    modules: SubAdminModuleSelection[];
    branch_unit_ids: string[];
  }) => Promise<void>;
}

export function SubAdminFormModal({
  open,
  onOpenChange,
  subAdmin,
  catalog,
  isCatalogLoading,
  units = [],
  isUnitsLoading,
  saving,
  onSubmit,
}: SubAdminFormModalProps) {
  const isEdit = Boolean(subAdmin);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    // Schema is chosen at runtime by mode (edit drops the password fields), so
    // the union resolver is cast to the superset form shape.
    resolver: zodResolver(
      isEdit ? baseSchema : createSchema
    ) as unknown as Resolver<FormValues>,
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
  });

  const [matrix, setMatrix] = useState<MatrixState>(() => emptyMatrix(catalog));
  const [matrixError, setMatrixError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [branchMode, setBranchMode] = useState<BranchMode>("all");
  const [branchUnitIds, setBranchUnitIds] = useState<string[]>([]);
  const [branchError, setBranchError] = useState<string | null>(null);

  // Re-seed RHF + matrix whenever the modal opens for a new target, or once the
  // catalog finishes loading while open. We derive during render (the project's
  // "set-state-in-effect"-free pattern, see teachers/page.tsx) keyed on a
  // session token so a fresh open — or a newly arrived catalog — reseeds state.
  const sessionToken = open
    ? `${subAdmin?.id ?? "__create__"}:${catalog.length}`
    : "__closed__";
  const [seededToken, setSeededToken] = useState<string>("__closed__");
  if (open && seededToken !== sessionToken) {
    setSeededToken(sessionToken);
    reset({
      name: subAdmin?.name ?? "",
      email: subAdmin?.email ?? "",
      password: "",
      confirmPassword: "",
    });
    setMatrix(
      subAdmin ? matrixFromSubAdmin(catalog, subAdmin) : emptyMatrix(catalog)
    );
    setBranchMode(branchModeFromSubAdmin(subAdmin));
    setBranchUnitIds(subAdmin?.branch_unit_ids ?? []);
    setMatrixError(null);
    setFormError(null);
    setBranchError(null);
  }

  const disabledKeys = useMemo(
    () => disabledModuleKeys(catalog, branchMode),
    [catalog, branchMode]
  );

  // Switching to "Specific branches" clears any selection on now-disabled
  // (non-branch-aware) modules so a stale grant can never be submitted.
  const handleBranchModeChange = (mode: BranchMode) => {
    setBranchMode(mode);
    setBranchError(null);
    if (mode === "specific") {
      const disabled = disabledModuleKeys(catalog, "specific");
      setMatrix((prev) => {
        const next: MatrixState = { ...prev };
        for (const key of disabled) {
          if (next[key]) {
            next[key] = { level: "none", delete: false, refund: false, manage: false };
          }
        }
        return next;
      });
    }
  };

  const toggleBranch = (unitId: string) => {
    setBranchError(null);
    setBranchUnitIds((prev) =>
      prev.includes(unitId)
        ? prev.filter((id) => id !== unitId)
        : [...prev, unitId]
    );
  };

  const handleMatrixChange = (key: string, next: ModuleState) => {
    if (disabledKeys.has(key)) return; // branch mode locks this module
    // Clearing the level to "none" also clears its toggles (backend ignores
    // toggles without a level, but the UI should reflect that).
    const normalized: ModuleState =
      next.level === "none"
        ? { ...next, delete: false, refund: false, manage: false }
        : next;
    setMatrix((prev) => ({ ...prev, [key]: normalized }));
    setMatrixError(null);
  };

  const submit = handleSubmit(async (values) => {
    setFormError(null);
    setBranchError(null);
    const selection = matrixToSelection(catalog, matrix);
    if (!selectionGrantsAnything(selection)) {
      setMatrixError("Select at least one module to grant.");
      return;
    }
    // Mirror the backend 422 rules so the user gets inline errors first.
    const branchValidation = validateBranchSelection(
      catalog,
      branchMode,
      branchUnitIds,
      selection
    );
    if (branchValidation) {
      setBranchError(branchValidation);
      return;
    }
    try {
      await onSubmit({
        name: values.name.trim(),
        email: values.email.trim(),
        ...(isEdit ? {} : { password: values.password }),
        modules: selection,
        // "All branches" → empty array (unrestricted) per the backend contract.
        branch_unit_ids: branchMode === "specific" ? branchUnitIds : [],
      });
      onOpenChange(false);
    } catch (err) {
      // Surface server errors (e.g. 409 duplicate email) as a form-level error.
      const message =
        err instanceof Error ? err.message : "Failed to save sub-admin";
      if (/email/i.test(message) && /exist|taken|duplicate/i.test(message)) {
        setError("email", { message });
      } else if (/branch/i.test(message)) {
        // Defense in depth: a server-side branch/module mismatch 422.
        setBranchError(message);
      } else {
        setFormError(message);
      }
    }
  });

  const description = useMemo(
    () =>
      isEdit
        ? "Update the sub-admin's name and module permissions. Use Reset password for credential changes."
        : "Create a limited admin. They receive their credentials by email and can only access the modules you grant.",
    [isEdit]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit sub-admin" : "Create sub-admin"}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-5">
          {formError && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {formError}
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="Full name"
                aria-invalid={Boolean(errors.name)}
                {...register("name")}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="email@school.com"
                disabled={isEdit}
                aria-invalid={Boolean(errors.email)}
                {...register("email")}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            {!isEdit && (
              <>
                <div className="grid gap-1.5">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder={`At least ${PASSWORD_MIN_LENGTH} characters`}
                    aria-invalid={Boolean(errors.password)}
                    {...register("password")}
                  />
                  {errors.password && (
                    <p className="text-sm text-destructive">
                      {errors.password.message}
                    </p>
                  )}
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="confirmPassword">Confirm password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Re-enter password"
                    aria-invalid={Boolean(errors.confirmPassword)}
                    {...register("confirmPassword")}
                  />
                  {errors.confirmPassword && (
                    <p className="text-sm text-destructive">
                      {errors.confirmPassword.message}
                    </p>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="space-y-2">
            <Label>Branch access</Label>
            <div className="flex flex-wrap gap-2">
              {(["all", "specific"] as BranchMode[]).map((mode) => {
                const active = branchMode === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => handleBranchModeChange(mode)}
                    className={
                      active
                        ? "rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
                        : "rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground hover:bg-muted"
                    }
                    aria-pressed={active}
                  >
                    {mode === "all" ? "All branches" : "Specific branches"}
                  </button>
                );
              })}
            </div>
            {branchMode === "specific" && (
              <div className="space-y-2 rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground">
                  Branch-restricted admins can only manage branch-scoped
                  modules.
                </p>
                {isUnitsLoading ? (
                  <p className="py-2 text-sm text-muted-foreground">
                    Loading branches…
                  </p>
                ) : units.length === 0 ? (
                  <p className="py-2 text-sm text-muted-foreground">
                    No branches available to assign.
                  </p>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {units.map((unit) => (
                      <label
                        key={unit.id}
                        className="flex items-center gap-2 text-sm text-foreground"
                      >
                        <input
                          type="checkbox"
                          checked={branchUnitIds.includes(unit.id)}
                          onChange={() => toggleBranch(unit.id)}
                          className="size-4 rounded border-input"
                        />
                        <span>{unit.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}
            {branchError && (
              <p className="text-sm text-destructive">{branchError}</p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Module permissions</Label>
              {matrixError && (
                <span className="text-sm text-destructive">{matrixError}</span>
              )}
            </div>
            {isCatalogLoading ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Loading modules…
              </p>
            ) : catalog.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No modules available to grant.
              </p>
            ) : (
              <ModulePermissionMatrix
                catalog={catalog}
                matrix={matrix}
                disabledKeys={disabledKeys}
                onChange={handleMatrixChange}
              />
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving || isCatalogLoading}>
              {saving ? "Saving…" : isEdit ? "Save changes" : "Create sub-admin"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
