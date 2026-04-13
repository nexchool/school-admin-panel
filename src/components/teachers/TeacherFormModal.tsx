"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Teacher, CreateTeacherInput } from "@/types/teacher";
import { toast } from "sonner";

interface TeacherFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: Teacher;
  onSubmit: (data: CreateTeacherInput) => Promise<void>;
}

export function TeacherFormModal({
  open,
  onOpenChange,
  initialData,
  onSubmit,
}: TeacherFormModalProps) {
  const [name, setName] = useState(initialData?.name ?? "");
  const [email, setEmail] = useState(initialData?.email ?? "");
  const [phone, setPhone] = useState(initialData?.phone ?? "");
  const [designation, setDesignation] = useState(initialData?.designation ?? "");
  const [department, setDepartment] = useState(initialData?.department ?? "");
  const [qualification, setQualification] = useState(
    initialData?.qualification ?? ""
  );
  const [specialization, setSpecialization] = useState(
    initialData?.specialization ?? ""
  );
  const [experienceYears, setExperienceYears] = useState(
    initialData?.experience_years?.toString() ?? ""
  );
  const [address, setAddress] = useState(initialData?.address ?? "");
  const [dateOfJoining, setDateOfJoining] = useState(
    initialData?.date_of_joining ?? ""
  );
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setName(initialData?.name ?? "");
    setEmail(initialData?.email ?? "");
    setPhone(initialData?.phone ?? "");
    setDesignation(initialData?.designation ?? "");
    setDepartment(initialData?.department ?? "");
    setQualification(initialData?.qualification ?? "");
    setSpecialization(initialData?.specialization ?? "");
    setExperienceYears(initialData?.experience_years?.toString() ?? "");
    setAddress(initialData?.address ?? "");
    setDateOfJoining(initialData?.date_of_joining ?? "");
  };

  const handleClose = (o: boolean) => {
    if (!o) reset();
    onOpenChange(o);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Name is required.");
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        designation: designation.trim() || undefined,
        department: department.trim() || undefined,
        qualification: qualification.trim() || undefined,
        specialization: specialization.trim() || undefined,
        experience_years: experienceYears ? parseInt(experienceYears, 10) : undefined,
        address: address.trim() || undefined,
        date_of_joining: dateOfJoining || undefined,
      });
      handleClose(false);
    } catch {
      // List page: error surfaced here. Detail page: parent toasts and rethrows.
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialData ? "Edit Teacher" : "Add Teacher"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@school.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 9876543210"
              />
            </div>
            <div className="space-y-2">
              <Label>Designation</Label>
              <Input
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                placeholder="e.g. Senior Teacher"
              />
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <Input
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g. Mathematics"
              />
            </div>
            <div className="space-y-2">
              <Label>Qualification</Label>
              <Input
                value={qualification}
                onChange={(e) => setQualification(e.target.value)}
                placeholder="e.g. M.Sc. Mathematics"
              />
            </div>
            <div className="space-y-2">
              <Label>Specialization</Label>
              <Input
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value)}
                placeholder="e.g. Algebra"
              />
            </div>
            <div className="space-y-2">
              <Label>Experience (years)</Label>
              <Input
                type="number"
                min={0}
                value={experienceYears}
                onChange={(e) => setExperienceYears(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Date of Joining</Label>
              <Input
                type="date"
                value={dateOfJoining}
                onChange={(e) => setDateOfJoining(e.target.value)}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Address</Label>
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Full address"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => handleClose(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving…" : initialData ? "Save" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
