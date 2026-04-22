"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useStudent, useUpdateStudent, useDeleteStudent } from "@/hooks/useStudents";
import { useClasses } from "@/hooks/useClasses";
import { StudentFormModal } from "@/components/students/StudentFormModal";
import { StudentDocumentsSection } from "@/components/students/StudentDocumentsSection";
import { Button } from "@/components/ui/button";
import {
  ProfileHeader,
  QuickStats,
  TabNav,
  SectionCard,
  DetailTable,
  ComingSoonCard,
  formatBool,
  formatCurrency,
  formatDate,
  getStatusVariant,
  type TabNavItem,
  type ProfileHeaderBadge,
  type QuickStatItem,
} from "@/components/detail";
import {
  Loader2,
  User,
  Users,
  MapPin,
  GraduationCap,
  Trophy,
  FileText,
  Mail,
  Phone,
  Calendar,
  Hash,
  Home,
  IdCard,
  Heart,
  Sparkles,
} from "lucide-react";
import type { Student, UpdateStudentInput } from "@/types/student";

type TabId =
  | "overview"
  | "personal"
  | "family"
  | "address"
  | "academic"
  | "activities"
  | "documents";

const TABS: TabNavItem<TabId>[] = [
  { id: "overview", label: "Overview", icon: User },
  { id: "personal", label: "Personal", icon: IdCard },
  { id: "family", label: "Family & Guardian", icon: Users },
  { id: "address", label: "Address", icon: MapPin },
  { id: "academic", label: "Academic", icon: GraduationCap },
  { id: "activities", label: "Activities", icon: Trophy },
  { id: "documents", label: "Documents", icon: FileText },
];

export default function StudentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string | undefined;
  const { data: student, isLoading } = useStudent(id ?? null);
  const { data: classes = [] } = useClasses();
  const updateMutation = useUpdateStudent();
  const deleteMutation = useDeleteStudent();
  const [editOpen, setEditOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("overview");

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

  const badges: ProfileHeaderBadge[] = [];
  if (student.class_name) {
    badges.push({
      label: student.class_name,
      variant: "secondary",
      icon: GraduationCap,
    });
  }
  if (student.roll_number != null) {
    badges.push({
      label: `Roll ${student.roll_number}`,
      variant: "outline",
      icon: Hash,
    });
  }
  if (student.student_status) {
    badges.push({
      label: student.student_status,
      variant: getStatusVariant(student.student_status),
    });
  }
  if (student.house_name) {
    badges.push({ label: `${student.house_name} House`, variant: "outline" });
  }

  const statsItems: QuickStatItem[] = [
    { icon: Calendar, label: "Academic Year", value: student.academic_year },
    { icon: GraduationCap, label: "Class", value: student.class_name },
    { icon: Hash, label: "Roll No.", value: student.roll_number?.toString() },
    {
      icon: Calendar,
      label: "Admission Date",
      value: formatDate(student.admission_date),
    },
    { icon: Heart, label: "Blood Group", value: student.blood_group },
    { icon: Phone, label: "Guardian", value: student.guardian_phone },
  ];

  return (
    <div className="space-y-6">
      <ProfileHeader
        name={student.name}
        subtitle={`Admission No. ${student.admission_number}`}
        profilePicture={student.profile_picture}
        badges={badges}
        backHref="/students"
        backLabel="Back to Students"
        onEdit={() => setEditOpen(true)}
        onDelete={handleDelete}
        isDeleting={deleteMutation.isPending}
      />

      <QuickStats items={statsItems} />

      <div className="space-y-5 pt-2">
        <TabNav tabs={TABS} active={activeTab} onChange={setActiveTab} />

        <div className="min-h-[300px]">
          {activeTab === "overview" && <OverviewTab student={student} />}
          {activeTab === "personal" && <PersonalTab student={student} />}
          {activeTab === "family" && <FamilyTab student={student} />}
          {activeTab === "address" && <AddressTab student={student} />}
          {activeTab === "academic" && <AcademicTab student={student} />}
          {activeTab === "activities" && <ActivitiesTab />}
          {activeTab === "documents" && (
            <StudentDocumentsSection studentId={student.id} />
          )}
        </div>
      </div>

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

// ---------------------------------------------------------------------------
// Tab content
// ---------------------------------------------------------------------------

function OverviewTab({ student }: { student: Student }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <SectionCard
        title="Basic Information"
        description="Student profile summary"
        icon={User}
      >
        <DetailTable
          rows={[
            ["Full Name", student.name],
            ["Admission Number", student.admission_number],
            ["Academic Year", student.academic_year],
            ["Gender", student.gender],
            ["Date of Birth", formatDate(student.date_of_birth)],
            ["Admission Date", formatDate(student.admission_date)],
            ["House", student.house_name],
            ["Status", student.student_status],
          ]}
        />
      </SectionCard>

      <SectionCard
        title="Contact"
        description="How to reach the student"
        icon={Mail}
      >
        <DetailTable
          rows={[
            ["Email", student.email],
            ["Phone", student.phone],
            ["Address", student.address],
          ]}
        />
      </SectionCard>

      <SectionCard
        title="Primary Guardian"
        description="Main point of contact"
        icon={Users}
      >
        <DetailTable
          rows={[
            ["Name", student.guardian_name],
            ["Relationship", student.guardian_relationship],
            ["Phone", student.guardian_phone],
            ["Email", student.guardian_email],
          ]}
        />
      </SectionCard>

      <SectionCard
        title="Emergency Contact"
        description="In case of emergency"
        icon={Phone}
      >
        <DetailTable
          rows={[
            ["Name", student.emergency_contact_name],
            ["Relationship", student.emergency_contact_relationship],
            ["Phone", student.emergency_contact_phone],
            ["Alt. Phone", student.emergency_contact_alt_phone],
          ]}
        />
      </SectionCard>
    </div>
  );
}

function PersonalTab({ student }: { student: Student }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <SectionCard
        title="Identity"
        description="Government IDs and demographics"
        icon={IdCard}
      >
        <DetailTable
          rows={[
            ["Aadhar Number", student.aadhar_number],
            ["APAAR ID", student.apaar_id],
            ["EMIS Number", student.emis_number],
            ["UDISE Student ID", student.udise_student_id],
            ["Religion", student.religion],
            ["Category", student.category],
            ["Caste", student.caste],
            ["Nationality", student.nationality],
            ["Mother Tongue", student.mother_tongue],
            ["Place of Birth", student.place_of_birth],
          ]}
        />
      </SectionCard>

      <SectionCard
        title="Health & Physical"
        description="Medical and physical information"
        icon={Heart}
      >
        <DetailTable
          rows={[
            ["Blood Group", student.blood_group],
            ["Height (cm)", student.height_cm?.toString()],
            ["Weight (kg)", student.weight_kg?.toString()],
            ["Allergies", student.medical_allergies],
            ["Medical Conditions", student.medical_conditions],
            ["Disability Details", student.disability_details],
            ["Identification Marks", student.identification_marks],
          ]}
        />
      </SectionCard>
    </div>
  );
}

function FamilyTab({ student }: { student: Student }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <SectionCard title="Father" description="Father's details" icon={User}>
        <DetailTable
          rows={[
            ["Name", student.father_name],
            ["Phone", student.father_phone],
            ["Email", student.father_email],
            ["Occupation", student.father_occupation],
            ["Annual Income", formatCurrency(student.father_annual_income)],
          ]}
        />
      </SectionCard>

      <SectionCard title="Mother" description="Mother's details" icon={User}>
        <DetailTable
          rows={[
            ["Name", student.mother_name],
            ["Phone", student.mother_phone],
            ["Email", student.mother_email],
            ["Occupation", student.mother_occupation],
            ["Annual Income", formatCurrency(student.mother_annual_income)],
          ]}
        />
      </SectionCard>

      <SectionCard
        title="Guardian"
        description="Legal guardian details"
        icon={Users}
        className="lg:col-span-2"
      >
        <DetailTable
          rows={[
            ["Name", student.guardian_name],
            ["Relationship", student.guardian_relationship],
            ["Phone", student.guardian_phone],
            ["Email", student.guardian_email],
            ["Occupation", student.guardian_occupation],
            ["Aadhar Number", student.guardian_aadhar_number],
            ["Address", student.guardian_address],
          ]}
        />
      </SectionCard>
    </div>
  );
}

function AddressTab({ student }: { student: Student }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <SectionCard
        title="Current Address"
        description="Where the student currently lives"
        icon={Home}
      >
        <DetailTable
          rows={[
            ["Address", student.current_address],
            ["City", student.current_city],
            ["State", student.current_state],
            ["Pincode", student.current_pincode],
          ]}
        />
      </SectionCard>

      <SectionCard
        title="Permanent Address"
        description="Registered permanent address"
        icon={MapPin}
      >
        <DetailTable
          rows={[
            ["Same as Current", formatBool(student.is_same_as_permanent_address)],
            ["Address", student.permanent_address],
            ["City", student.permanent_city],
            ["State", student.permanent_state],
            ["Pincode", student.permanent_pincode],
          ]}
        />
      </SectionCard>

      <SectionCard
        title="Commute"
        description="Outstation commute details"
        icon={MapPin}
        className="lg:col-span-2"
      >
        <DetailTable
          rows={[
            [
              "Commuting from Outstation",
              formatBool(student.is_commuting_from_outstation),
            ],
            ["Location", student.commute_location],
            ["Notes", student.commute_notes],
          ]}
        />
      </SectionCard>
    </div>
  );
}

function AcademicTab({ student }: { student: Student }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <SectionCard
        title="Current Class"
        description="Currently enrolled class"
        icon={GraduationCap}
      >
        <DetailTable
          rows={[
            ["Class", student.class_name ?? "Not assigned"],
            ["Roll Number", student.roll_number?.toString()],
            ["Academic Year", student.academic_year],
            ["House", student.house_name],
            ["Status", student.student_status],
          ]}
        />
      </SectionCard>

      <SectionCard
        title="Previous School"
        description="Prior educational history"
        icon={GraduationCap}
      >
        <DetailTable
          rows={[
            ["School Name", student.previous_school_name],
            ["Class", student.previous_school_class],
            ["Board", student.last_school_board],
            ["TC Number", student.tc_number],
          ]}
        />
      </SectionCard>

      <ComingSoonCard
        title="Report Card"
        description="Term-wise report cards will be shown here once available."
        icon={FileText}
      />

      <ComingSoonCard
        title="Weekly Test Marks"
        description="Weekly test scores and trends across subjects."
        icon={Sparkles}
      />

      <ComingSoonCard
        title="Final Result"
        description="End-of-year result summary and grade card."
        icon={Trophy}
        className="lg:col-span-2"
      />
    </div>
  );
}

function ActivitiesTab() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <ComingSoonCard
        title="Co-curricular Activities"
        description="Clubs, sports, and other activities the student participates in."
        icon={Sparkles}
      />
      <ComingSoonCard
        title="Achievements & Awards"
        description="Awards, certificates and notable achievements."
        icon={Trophy}
      />
      <ComingSoonCard
        title="Event Participation"
        description="School events, competitions and performance history."
        icon={Calendar}
        className="lg:col-span-2"
      />
    </div>
  );
}
