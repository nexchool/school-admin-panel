"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useStudent, useUpdateStudent, useDeleteStudent } from "@/hooks/useStudents";
import { useClasses } from "@/hooks/useClasses";
import { StudentFormModal } from "@/components/students/StudentFormModal";
import { StudentDocumentsSection } from "@/components/students/StudentDocumentsSection";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Pencil, Trash2, Loader2 } from "lucide-react";
import { useState } from "react";
import type { UpdateStudentInput } from "@/types/student";

export default function StudentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string | undefined;
  const { data: student, isLoading } = useStudent(id ?? null);
  const { data: classes = [] } = useClasses();
  const updateMutation = useUpdateStudent();
  const deleteMutation = useDeleteStudent();
  const [editOpen, setEditOpen] = useState(false);

  const handleUpdate = async (data: UpdateStudentInput) => {
    if (!id) return;
    await updateMutation.mutateAsync({ id, input: data });
    setEditOpen(false);
  };

  const handleDelete = async () => {
    if (!id || !confirm("Are you sure you want to delete this student?")) return;
    await deleteMutation.mutateAsync(id);
    router.push("/students");
  };

  if (isLoading || !id) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="space-y-4">
        <p className="text-destructive">Student not found.</p>
        <Link href="/students">
          <Button variant="outline">Back to Students</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link href="/students">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {student.name}
            </h1>
            <p className="text-muted-foreground">
              {student.admission_number}
              {student.class_name && ` • ${student.class_name}`}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setEditOpen(true)} className="gap-2">
            <Pencil className="size-4" />
            Edit
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="gap-2"
          >
            <Trash2 className="size-4" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Student profile details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow label="Admission Number" value={student.admission_number} />
            <InfoRow label="Academic Year" value={student.academic_year ?? "—"} />
            <InfoRow label="Gender" value={student.gender} />
            <InfoRow label="Date of Birth" value={student.date_of_birth} />
            <InfoRow label="Admission Date" value={student.admission_date} />
            <InfoRow label="House" value={student.house_name} />
            <InfoRow label="Status" value={student.student_status} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
            <CardDescription>Email, phone, address</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow label="Email" value={student.email} />
            <InfoRow label="Phone" value={student.phone} />
            <InfoRow label="Address" value={student.address} />
            <InfoRow label="Guardian Address" value={student.guardian_address} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Guardian Information</CardTitle>
            <CardDescription>Parent/guardian details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow label="Guardian Name" value={student.guardian_name} />
            <InfoRow label="Relationship" value={student.guardian_relationship} />
            <InfoRow label="Guardian Phone" value={student.guardian_phone} />
            <InfoRow label="Guardian Email" value={student.guardian_email} />
            <InfoRow label="Guardian Occupation" value={student.guardian_occupation} />
            <InfoRow label="Guardian Aadhar" value={student.guardian_aadhar_number} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Class Information</CardTitle>
            <CardDescription>Current class and roll</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow label="Class" value={student.class_name ?? "Not assigned"} />
            <InfoRow
              label="Roll Number"
              value={student.roll_number?.toString() ?? "—"}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Parent / Family</CardTitle>
            <CardDescription>Father and mother details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow label="Father Name" value={student.father_name} />
            <InfoRow label="Father Phone" value={student.father_phone} />
            <InfoRow label="Father Email" value={student.father_email} />
            <InfoRow label="Father Occupation" value={student.father_occupation} />
            <InfoRow
              label="Father Annual Income"
              value={student.father_annual_income != null ? String(student.father_annual_income) : null}
            />
            <InfoRow label="Mother Name" value={student.mother_name} />
            <InfoRow label="Mother Phone" value={student.mother_phone} />
            <InfoRow label="Mother Email" value={student.mother_email} />
            <InfoRow label="Mother Occupation" value={student.mother_occupation} />
            <InfoRow
              label="Mother Annual Income"
              value={student.mother_annual_income != null ? String(student.mother_annual_income) : null}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Health</CardTitle>
            <CardDescription>Health and physical info</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow label="Blood Group" value={student.blood_group} />
            <InfoRow label="Height (cm)" value={student.height_cm != null ? String(student.height_cm) : null} />
            <InfoRow label="Weight (kg)" value={student.weight_kg != null ? String(student.weight_kg) : null} />
            <InfoRow label="Allergies" value={student.medical_allergies} />
            <InfoRow label="Conditions" value={student.medical_conditions} />
            <InfoRow label="Disability" value={student.disability_details} />
            <InfoRow label="Identification Marks" value={student.identification_marks} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Identity</CardTitle>
            <CardDescription>Identity & demographics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow label="Aadhar" value={student.aadhar_number} />
            <InfoRow label="APAAR ID" value={student.apaar_id} />
            <InfoRow label="EMIS Number" value={student.emis_number} />
            <InfoRow label="UDISE Student ID" value={student.udise_student_id} />
            <InfoRow label="Religion" value={student.religion} />
            <InfoRow label="Category" value={student.category} />
            <InfoRow label="Caste" value={student.caste} />
            <InfoRow label="Nationality" value={student.nationality} />
            <InfoRow label="Mother Tongue" value={student.mother_tongue} />
            <InfoRow label="Place of Birth" value={student.place_of_birth} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Residence</CardTitle>
            <CardDescription>Current and permanent addresses</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow label="Same as Permanent" value={student.is_same_as_permanent_address != null ? (student.is_same_as_permanent_address ? "Yes" : "No") : null} />
            <InfoRow label="Current Address" value={student.current_address} />
            <InfoRow label="Current City" value={student.current_city} />
            <InfoRow label="Current State" value={student.current_state} />
            <InfoRow label="Current Pincode" value={student.current_pincode} />
            <InfoRow label="Permanent Address" value={student.permanent_address} />
            <InfoRow label="Permanent City" value={student.permanent_city} />
            <InfoRow label="Permanent State" value={student.permanent_state} />
            <InfoRow label="Permanent Pincode" value={student.permanent_pincode} />
            <InfoRow label="Outstation Commute" value={student.is_commuting_from_outstation != null ? (student.is_commuting_from_outstation ? "Yes" : "No") : null} />
            <InfoRow label="Commute Location" value={student.commute_location} />
            <InfoRow label="Commute Notes" value={student.commute_notes} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Emergency Contact</CardTitle>
            <CardDescription>Emergency contact information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow label="Name" value={student.emergency_contact_name} />
            <InfoRow label="Relationship" value={student.emergency_contact_relationship} />
            <InfoRow label="Phone" value={student.emergency_contact_phone} />
            <InfoRow label="Alt Phone" value={student.emergency_contact_alt_phone} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Previous School</CardTitle>
            <CardDescription>Previous school details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow label="School Name" value={student.previous_school_name} />
            <InfoRow label="Class" value={student.previous_school_class} />
            <InfoRow label="Board" value={student.last_school_board} />
            <InfoRow label="TC Number" value={student.tc_number} />
          </CardContent>
        </Card>
      </div>

      <StudentDocumentsSection studentId={student.id} />

      <StudentFormModal
        open={editOpen}
        onOpenChange={setEditOpen}
        initialData={student}
        classes={classes}
        onSubmit={handleUpdate}
      />
    </div>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  if (value == null || value === "") return null;
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-sm">{value}</p>
    </div>
  );
}
