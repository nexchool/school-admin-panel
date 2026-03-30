"use client";

import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { financeService } from "@/services/financeService";
import { useAcademicYears } from "@/hooks/useAcademicYears";
import type { FeeStructure, CreateStructureInput } from "@/services/financeService";
import { Plus, Trash2 } from "lucide-react";

interface FeeStructureFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  initialData?: FeeStructure;
  onSuccess?: () => void;
}

export function FeeStructureFormModal({
  open,
  onOpenChange,
  mode,
  initialData,
  onSuccess,
}: FeeStructureFormModalProps) {
  const { data: academicYears = [] } = useAcademicYears(false, {
    enabled: open,
  });
  const [name, setName] = useState(initialData?.name ?? "");
  const [academicYearId, setAcademicYearId] = useState(
    initialData?.academic_year_id ?? ""
  );
  const [dueDate, setDueDate] = useState(initialData?.due_date ?? "");
  const [classIds, setClassIds] = useState<string[]>(
    initialData?.class_ids ?? []
  );
  const [components, setComponents] = useState<
    { name: string; amount: string; is_optional: boolean }[]
  >(
    initialData?.components?.map((c) => ({
      name: c.name,
      amount: String(c.amount ?? 0),
      is_optional: c.is_optional ?? false,
    })) ?? [{ name: "", amount: "", is_optional: false }]
  );
  const [availableClasses, setAvailableClasses] = useState<
    { id: string; name: string; section?: string }[]
  >([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setName(initialData?.name ?? "");
      setAcademicYearId(initialData?.academic_year_id ?? "");
      setDueDate(initialData?.due_date ?? "");
      setClassIds(initialData?.class_ids ?? []);
      setComponents(
        initialData?.components?.map((c) => ({
          name: c.name,
          amount: String(c.amount ?? 0),
          is_optional: c.is_optional ?? false,
        })) ?? [{ name: "", amount: "", is_optional: false }]
      );
    }
  }, [open, initialData]);

  useEffect(() => {
    if (!open) return;
    const ayId = academicYearId || initialData?.academic_year_id;
    if (!ayId) {
      setAvailableClasses([]);
      return;
    }
    financeService
      .getAvailableClassesForStructure(
        ayId,
        mode === "edit" ? initialData?.id : undefined
      )
      .then(setAvailableClasses)
      .catch(() => setAvailableClasses([]));
  }, [open, academicYearId, initialData?.academic_year_id, initialData?.id, mode]);

  const addComponent = () => {
    setComponents([...components, { name: "", amount: "", is_optional: false }]);
  };

  const removeComponent = (i: number) => {
    if (components.length <= 1) return;
    setComponents(components.filter((_, idx) => idx !== i));
  };

  const updateComponent = (
    i: number,
    field: "name" | "amount" | "is_optional",
    value: string | boolean
  ) => {
    const next = [...components];
    next[i] = { ...next[i], [field]: value };
    setComponents(next);
  };

  const toggleClass = (classId: string) => {
    setClassIds((prev) =>
      prev.includes(classId)
        ? prev.filter((c) => c !== classId)
        : [...prev, classId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert("Name is required");
      return;
    }
    if (mode === "create" && !academicYearId) {
      alert("Academic year is required");
      return;
    }
    if (!dueDate.trim()) {
      alert("Due date is required");
      return;
    }
    const comps = components
      .filter((c) => c.name.trim() && c.amount.trim())
      .map((c) => ({
        name: c.name.trim(),
        amount: parseFloat(c.amount) || 0,
        is_optional: c.is_optional,
      }));
    if (comps.length === 0) {
      alert("Add at least one component");
      return;
    }
    setSubmitting(true);
    try {
      const payload: CreateStructureInput = {
        name: name.trim(),
        academic_year_id: academicYearId || initialData!.academic_year_id,
        due_date: dueDate.trim(),
        components: comps,
        class_ids: classIds.length > 0 ? classIds : undefined,
      };
      if (mode === "edit" && initialData) {
        await financeService.updateStructure(initialData.id, payload);
      } else {
        await financeService.createStructure(payload);
      }
      onSuccess?.();
      onOpenChange(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "edit" ? "Edit Fee Structure" : "Create Fee Structure"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Name *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Term 1 Fee 2025"
            />
          </div>
          {mode === "create" && (
            <div className="space-y-2">
              <Label>Academic Year *</Label>
              <Select
                value={academicYearId}
                onValueChange={setAcademicYearId}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  {academicYears.map((ay) => (
                    <SelectItem key={ay.id} value={ay.id}>
                      {ay.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label>Classes (optional – empty = all)</Label>
            <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
              {availableClasses.map((c) => (
                <Button
                  key={c.id}
                  type="button"
                  variant={classIds.includes(c.id) ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleClass(c.id)}
                >
                  {c.name}
                  {c.section ? `-${c.section}` : ""}
                </Button>
              ))}
              {availableClasses.length === 0 && academicYearId && (
                <span className="text-sm text-muted-foreground">
                  No classes available or all already assigned
                </span>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Due Date *</Label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Components *</Label>
              <Button type="button" variant="outline" size="sm" onClick={addComponent}>
                <Plus className="size-4 mr-1" />
                Add
              </Button>
            </div>
            {components.map((c, i) => (
              <div key={i} className="flex gap-2 items-center">
                <Input
                  value={c.name}
                  onChange={(e) => updateComponent(i, "name", e.target.value)}
                  placeholder="Component name"
                  className="flex-1"
                />
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={c.amount}
                  onChange={(e) => updateComponent(i, "amount", e.target.value)}
                  placeholder="Amount"
                  className="w-24"
                />
                <label className="flex items-center gap-1 text-sm">
                  <input
                    type="checkbox"
                    checked={c.is_optional}
                    onChange={(e) =>
                      updateComponent(i, "is_optional", e.target.checked)
                    }
                  />
                  Optional
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeComponent(i)}
                  disabled={components.length <= 1}
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving…" : mode === "edit" ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
