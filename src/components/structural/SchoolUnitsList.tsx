"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks";
import {
  useCreateSchoolUnit,
  useDeleteSchoolUnit,
  useSchoolUnits,
} from "@/hooks/useSchoolUnits";
import { ApiException } from "@/services/api";
import type { SchoolUnit } from "@/services/schoolUnitsService";

export function SchoolUnitsList() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission("school_unit.manage");

  const { data = [], isLoading } = useSchoolUnits();
  const createMut = useCreateSchoolUnit();
  const deleteMut = useDeleteSchoolUnit();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");

  const reset = () => {
    setName("");
    setCode("");
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) {
      toast.error("Name and code are required.");
      return;
    }
    createMut.mutate(
      { name: name.trim(), code: code.trim() },
      {
        onSuccess: () => {
          toast.success("Branch added.");
          setOpen(false);
          reset();
        },
        onError: (e) =>
          toast.error(
            e instanceof ApiException
              ? e.message
              : e instanceof Error
                ? e.message
                : "Could not add unit.",
          ),
      },
    );
  };

  const onDelete = (unit: SchoolUnit) => {
    if (!window.confirm(`Delete branch “${unit.name}”?`)) return;
    deleteMut.mutate(unit.id, {
      onSuccess: () => toast.success("Branch deleted."),
      onError: (e) =>
        toast.error(
          e instanceof ApiException
            ? e.message
            : e instanceof Error
              ? e.message
              : "Delete failed.",
        ),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Button asChild variant="outline" size="sm" className="gap-1">
          <Link href="/school-setup">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to setup
          </Link>
        </Button>
        {canManage ? (
          <Button type="button" onClick={() => setOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Add branch
          </Button>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Branches</CardTitle>
          <CardDescription>
            Add each campus or branch your school operates. One organisation can
            have many branches.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </p>
          ) : data.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No units yet. Add at least one to continue.
            </p>
          ) : (
            <ul className="divide-y rounded-md border">
              {data.map((u) => (
                <li
                  key={u.id}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{u.name}</p>
                    <p className="text-xs text-muted-foreground">{u.code}</p>
                  </div>
                  {canManage ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => onDelete(u)}
                      disabled={deleteMut.isPending}
                      aria-label={`Delete ${u.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={onSubmit}>
            <DialogHeader>
              <DialogTitle>Add branch</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="su-name">Name</Label>
                <Input
                  id="su-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. North Campus"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="su-code">Code</Label>
                <Input
                  id="su-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="e.g. MHS"
                  maxLength={32}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createMut.isPending}>
                {createMut.isPending ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
