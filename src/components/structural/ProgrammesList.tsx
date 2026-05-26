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
  useCreateProgramme,
  useDeleteProgramme,
  useProgrammes,
} from "@/hooks/useProgrammes";
import { ApiException } from "@/services/api";
import type { AcademicProgramme } from "@/services/programmesService";

export function ProgrammesList() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission("programme.manage");

  const { data = [], isLoading } = useProgrammes();
  const createMut = useCreateProgramme();
  const deleteMut = useDeleteProgramme();

  const [open, setOpen] = useState(false);
  const [board, setBoard] = useState("");
  const [medium, setMedium] = useState("");
  const [code, setCode] = useState("");

  const reset = () => {
    setBoard("");
    setMedium("");
    setCode("");
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const b = board.trim();
    const m = medium.trim();
    const c = code.trim();
    if (!b || !c) {
      toast.error("Board and code are required.");
      return;
    }
    const name = m ? `${b} ${m}` : b;
    const payload: {
      name: string;
      board: string;
      code: string;
      medium?: string;
    } = { name, board: b, code: c };
    if (m) payload.medium = m;
    createMut.mutate(payload, {
      onSuccess: () => {
        toast.success("Programme added.");
        setOpen(false);
        reset();
      },
      onError: (e) =>
        toast.error(
          e instanceof ApiException
            ? e.message
            : e instanceof Error
              ? e.message
              : "Could not add programme.",
        ),
    });
  };

  const onDelete = (p: AcademicProgramme) => {
    if (!window.confirm(`Delete programme “${p.name}”?`)) return;
    deleteMut.mutate(p.id, {
      onSuccess: () => toast.success("Programme deleted."),
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
            <Plus className="h-4 w-4" /> Add programme
          </Button>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Programmes (boards)</CardTitle>
          <CardDescription>
            Add each board you offer. Use medium only when you need to
            distinguish language tracks (e.g. GSEB Gujarati vs GSEB English).
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
              No programmes yet. Add at least one to continue.
            </p>
          ) : (
            <ul className="divide-y rounded-md border">
              {data.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {[p.board, p.medium, p.code].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  {canManage ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => onDelete(p)}
                      disabled={deleteMut.isPending}
                      aria-label={`Delete ${p.name}`}
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
          <form onSubmit={submit}>
            <DialogHeader>
              <DialogTitle>Add programme</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="prog-board">Board</Label>
                  <Input
                    id="prog-board"
                    value={board}
                    onChange={(e) => setBoard(e.target.value)}
                    placeholder="CBSE / GSEB / ICSE"
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prog-medium">Medium (optional)</Label>
                  <Input
                    id="prog-medium"
                    value={medium}
                    onChange={(e) => setMedium(e.target.value)}
                    placeholder="e.g. English, Gujarati"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="prog-code">Code</Label>
                <Input
                  id="prog-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Short code, e.g. CBSE or GSEB-GUJ"
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
