"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAcademicYears } from "@/hooks/useAcademicYears";
import { usePromoteYear } from "@/hooks/useSchoolSetup";
import { ApiException } from "@/services/api";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PromoteYearDialog({ open, onOpenChange }: Props) {
  const { data: years = [] } = useAcademicYears(false);
  const mut = usePromoteYear();

  const [sourceId, setSourceId] = useState("");
  const [targetId, setTargetId] = useState("");
  const [applySubjects, setApplySubjects] = useState(true);

  const submit = () => {
    if (!sourceId || !targetId) {
      toast.error("Pick source and target year.");
      return;
    }
    if (sourceId === targetId) {
      toast.error("Source and target year must differ.");
      return;
    }
    mut.mutate(
      {
        source_year_id: sourceId,
        target_year_id: targetId,
        apply_subjects: applySubjects,
      },
      {
        onSuccess: (res) => {
          toast.success(
            `Promoted ${res.classes_created} class(es); skipped ${res.classes_skipped}` +
              (res.subject_links_created
                ? `; ${res.subject_links_created} subject link(s) created.`
                : "."),
          );
          onOpenChange(false);
          setSourceId("");
          setTargetId("");
        },
        onError: (e) =>
          toast.error(
            e instanceof ApiException
              ? e.message
              : e instanceof Error
                ? e.message
                : "Promote failed.",
          ),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Promote to next academic year</DialogTitle>
          <DialogDescription>
            Clone every class from the source year into the target year. Re-
            running is safe — existing classes are skipped.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-1">
          <div className="space-y-1">
            <Label>Source year</Label>
            <Select value={sourceId} onValueChange={setSourceId}>
              <SelectTrigger>
                <SelectValue placeholder="Select source" />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y.id} value={y.id}>
                    {y.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Target year</Label>
            <Select value={targetId} onValueChange={setTargetId}>
              <SelectTrigger>
                <SelectValue placeholder="Select target" />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y.id} value={y.id}>
                    {y.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={applySubjects}
              onChange={(e) => setApplySubjects(e.target.checked)}
              className="h-4 w-4"
            />
            Also apply subject offerings to new classes
          </label>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={submit} disabled={mut.isPending}>
            {mut.isPending ? (
              <>
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                Promoting…
              </>
            ) : (
              "Promote year"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
