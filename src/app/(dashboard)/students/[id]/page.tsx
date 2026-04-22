"use client";

import { useMemo, useState, type ReactNode } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ArrowLeft,
  Pencil,
  Trash2,
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
import { cn } from "@/lib/utils";
import type { Student, UpdateStudentInput } from "@/types/student";

type TabId =
  | "overview"
  | "personal"
  | "family"
  | "address"
  | "academic"
  | "activities"
  | "documents";

interface TabConfig {
  id: TabId;
  label: string;
  icon: typeof User;
}

const TABS: TabConfig[] = [
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

  return (
    <div className="space-y-6">
      <ProfileHeader
        student={student}
        onEdit={() => setEditOpen(true)}
        onDelete={handleDelete}
        isDeleting={deleteMutation.isPending}
      />

      <QuickStats student={student} />

      <div className="space-y-5 pt-2">
        <TabNav active={activeTab} onChange={setActiveTab} />

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
// Header
// ---------------------------------------------------------------------------

function ProfileHeader({
  student,
  onEdit,
  onDelete,
  isDeleting,
}: {
  student: Student;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  const initials = useMemo(() => getInitials(student.name), [student.name]);
  const statusVariant = getStatusVariant(student.student_status);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Link href="/students">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>
        <span className="text-sm text-muted-foreground">Back to Students</span>
      </div>

      <Card className="overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-primary/15 via-primary/5 to-transparent" />
        <div className="flex flex-col gap-4 px-6 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <Avatar className="-mt-12 size-24 border-4 border-background shadow-sm">
              {student.profile_picture && (
                <AvatarImage src={student.profile_picture} alt={student.name} />
              )}
              <AvatarFallback className="text-xl font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-2">
              <div>
                <h1 className="text-2xl font-semibold leading-tight tracking-tight">
                  {student.name}
                </h1>
                <p className="text-sm text-muted-foreground">
                  Admission No. {student.admission_number}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {student.class_name && (
                  <Badge variant="secondary" className="gap-1">
                    <GraduationCap className="size-3" />
                    {student.class_name}
                  </Badge>
                )}
                {student.roll_number != null && (
                  <Badge variant="outline" className="gap-1">
                    <Hash className="size-3" />
                    Roll {student.roll_number}
                  </Badge>
                )}
                {student.student_status && (
                  <Badge variant={statusVariant}>{student.student_status}</Badge>
                )}
                {student.house_name && (
                  <Badge variant="outline">{student.house_name} House</Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex shrink-0 gap-2 sm:self-end">
            <Button variant="outline" onClick={onEdit} className="gap-2">
              <Pencil className="size-4" />
              Edit
            </Button>
            <Button
              variant="destructive"
              onClick={onDelete}
              disabled={isDeleting}
              className="gap-2"
            >
              <Trash2 className="size-4" />
              Delete
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Quick Stats
// ---------------------------------------------------------------------------

function QuickStats({ student }: { student: Student }) {
  const items: Array<{ icon: typeof User; label: string; value?: string | null }> = [
    { icon: Calendar, label: "Academic Year", value: student.academic_year },
    { icon: GraduationCap, label: "Class", value: student.class_name },
    { icon: Hash, label: "Roll No.", value: student.roll_number?.toString() },
    { icon: Calendar, label: "Admission Date", value: formatDate(student.admission_date) },
    { icon: Heart, label: "Blood Group", value: student.blood_group },
    { icon: Phone, label: "Guardian", value: student.guardian_phone },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-lg border border-border bg-card p-3"
        >
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <item.icon className="size-3.5" />
            {item.label}
          </div>
          <p className="mt-1 truncate text-sm font-semibold">
            {item.value && item.value !== "" ? item.value : "—"}
          </p>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------

function TabNav({
  active,
  onChange,
}: {
  active: TabId;
  onChange: (id: TabId) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <div
        role="tablist"
        className="inline-flex min-w-full items-center gap-1 rounded-lg border border-border bg-muted/50 p-1"
      >
        {TABS.map((tab) => {
          const isActive = tab.id === active;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(tab.id)}
              className={cn(
                "flex shrink-0 items-center gap-2 whitespace-nowrap rounded-md px-3.5 py-1.5 text-sm font-medium transition-all",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                isActive
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="size-4" />
              {tab.label}
            </button>
          );
        })}
      </div>
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
      <SectionCard
        title="Father"
        description="Father's details"
        icon={User}
      >
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

      <SectionCard
        title="Mother"
        description="Mother's details"
        icon={User}
      >
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
            [
              "Same as Current",
              formatBool(student.is_same_as_permanent_address),
            ],
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

// ---------------------------------------------------------------------------
// Reusable pieces
// ---------------------------------------------------------------------------

type DetailRow = [label: string, value: string | null | undefined];

function SectionCard({
  title,
  description,
  icon: Icon,
  children,
  className,
}: {
  title: string;
  description?: string;
  icon?: typeof User;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          {Icon && <Icon className="size-4 text-muted-foreground" />}
          {title}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function DetailTable({ rows }: { rows: DetailRow[] }) {
  const filled = rows.filter(([, v]) => v != null && v !== "");
  if (filled.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        No information available.
      </p>
    );
  }
  return (
    <div className="overflow-hidden rounded-md border border-border">
      <dl className="divide-y divide-border">
        {filled.map(([label, value], idx) => (
          <div
            key={label}
            className={cn(
              "grid grid-cols-[40%_60%] gap-3 px-3 py-2.5 text-sm sm:grid-cols-[35%_65%]",
              idx % 2 === 1 && "bg-muted/40"
            )}
          >
            <dt className="font-medium text-muted-foreground">{label}</dt>
            <dd className="break-words text-foreground">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function ComingSoonCard({
  title,
  description,
  icon: Icon,
  className,
}: {
  title: string;
  description: string;
  icon: typeof User;
  className?: string;
}) {
  return (
    <Card className={cn("border-dashed", className)}>
      <CardContent className="flex flex-col items-center justify-center gap-3 py-10 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-muted">
          <Icon className="size-5 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <p className="font-medium">{title}</p>
          <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
        </div>
        <Badge variant="outline" className="mt-1">
          Coming soon
        </Badge>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getInitials(name: string): string {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function getStatusVariant(
  status?: string
): "default" | "secondary" | "destructive" | "outline" {
  if (!status) return "outline";
  const s = status.toLowerCase();
  if (["active", "enrolled", "promoted"].includes(s)) return "default";
  if (["inactive", "graduated", "transferred"].includes(s)) return "secondary";
  if (["suspended", "expelled", "dropped"].includes(s)) return "destructive";
  return "outline";
}

function formatDate(value?: string | null): string | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatCurrency(value?: number | null): string | undefined {
  if (value == null) return undefined;
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return value.toString();
  }
}

function formatBool(value?: boolean | null): string | undefined {
  if (value == null) return undefined;
  return value ? "Yes" : "No";
}
