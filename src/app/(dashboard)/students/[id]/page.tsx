"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useStudent, useUpdateStudent, useDeleteStudent } from "@/hooks/useStudents";
import { useClasses } from "@/hooks/useClasses";
import { useStudentFees } from "@/hooks/useStudentFees";
import { useStudentAttendance } from "@/hooks/useStudentAttendance";
import { useStudentAllocation } from "@/hooks/useHostel";
import { useAuth } from "@/components/providers/AuthProvider";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { StudentFormModal } from "@/components/students/StudentFormModal";
import { StudentDocumentsSection } from "@/components/students/StudentDocumentsSection";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  EDITABLE_STUDENT_STATUS_OPTIONS,
  isWorkflowStatus,
  studentStatusLabel,
} from "@/constants/studentStatus";
import {
  StudentLifecycleDialog,
  type LifecycleAct,
} from "@/components/students/StudentLifecycleDialog";
import {
  ProfileHeader,
  QuickStats,
  TabNav,
  SectionCard,
  DetailTable,
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
  FileText,
  Mail,
  Phone,
  Calendar,
  Hash,
  Home,
  IdCard,
  Heart,
  ClipboardList,
  Wallet,
  CalendarCheck,
  Bus,
  Building2,
  ChevronDown,
  Check,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import type { Student, UpdateStudentInput } from "@/types/student";
import { toastError } from "@/lib/errorToast";

type TabId =
  | "overview"
  | "personal"
  | "family"
  | "address"
  | "academic"
  | "documents"
  | "records";

const BASE_TABS: TabNavItem<TabId>[] = [
  { id: "overview", label: "Overview", icon: User },
  { id: "personal", label: "Personal", icon: IdCard },
  { id: "family", label: "Family & Guardian", icon: Users },
  { id: "address", label: "Address", icon: MapPin },
  { id: "academic", label: "Academic", icon: GraduationCap },
  { id: "documents", label: "Documents", icon: FileText },
];

const RECORDS_TAB: TabNavItem<TabId> = {
  id: "records",
  label: "Records",
  icon: ClipboardList,
};

// Permissions that unlock the linked-records tab (fees / attendance / transport /
// hostel). `hasPermission` is wildcard-aware, so `.manage` / `system.manage` pass.
const RECORD_PERMS = [
  "finance.read",
  "attendance.read.all",
  "attendance.read.class",
  "transport.enrollment.read",
  "hostel.read",
] as const;

export default function StudentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string | undefined;
  const { data: student, isLoading, isError } = useStudent(id ?? null);
  const { data: classes = [] } = useClasses();
  const { hasAnyPermission } = useAuth();
  const updateMutation = useUpdateStudent();
  const deleteMutation = useDeleteStudent();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  const canSeeRecords = hasAnyPermission(RECORD_PERMS);
  const tabs = useMemo<TabNavItem<TabId>[]>(
    () => (canSeeRecords ? [...BASE_TABS, RECORDS_TAB] : BASE_TABS),
    [canSeeRecords]
  );

  const [lifecycleAct, setLifecycleAct] = useState<LifecycleAct | null>(null);

  const handleUpdate = async (data: UpdateStudentInput) => {
    if (!id) return;
    await updateMutation.mutateAsync({ id, input: data });
    setEditOpen(false);
  };

  const handleStatusChange = async (status: string) => {
    if (!id || status === student?.student_status) return;
    try {
      await updateMutation.mutateAsync({ id, input: { student_status: status } });
      // Success toast ("Student updated") owned by useUpdateStudent.
    } catch (e: unknown) {
      toastError(e, "Failed to update status");
    }
  };

  const performDelete = async () => {
    if (!id) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("Student deleted");
      router.push("/students");
    } catch (e: unknown) {
      toastError(e, "Failed to delete student");
      throw e;
    }
  };

  if (isLoading || !id) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !student) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <div className="max-w-md space-y-4 rounded-lg border border-border bg-card p-8 text-center">
          <p className="text-sm font-medium text-foreground">
            This student isn&apos;t available
          </p>
          <p className="text-sm text-muted-foreground">
            You may not have access to this branch, or the record was removed.
          </p>
          <Link href="/students">
            <Button variant="outline">Back to Students</Button>
          </Link>
        </div>
      </div>
    );
  }

  // A student who has withdrawn, graduated or transferred out holds no place
  // in a class. What they need is re-enrollment, not another way to leave.
  const hasLeft = isWorkflowStatus(student.student_status);

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
        onDelete={() => setDeleteConfirmOpen(true)}
        isDeleting={deleteMutation.isPending}
        extraActions={
          <div className="flex flex-wrap items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="gap-2"
                  disabled={updateMutation.isPending || hasLeft}
                >
                  Status: {studentStatusLabel(student.student_status)}
                  <ChevronDown className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Change status</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {EDITABLE_STUDENT_STATUS_OPTIONS.map((o) => (
                  <DropdownMenuItem
                    key={o.value}
                    onClick={() => handleStatusChange(o.value)}
                    disabled={o.value === student.student_status}
                    className="gap-2"
                  >
                    {o.value === student.student_status ? (
                      <Check className="size-4" />
                    ) : (
                      <span className="size-4" />
                    )}
                    {o.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  Lifecycle
                  <ChevronDown className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Record what happened</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {hasLeft ? (
                  <DropdownMenuItem onClick={() => setLifecycleAct("reEnroll")}>
                    Re-enroll…
                  </DropdownMenuItem>
                ) : (
                  <>
                    <DropdownMenuItem
                      onClick={() => setLifecycleAct("transferToSection")}
                    >
                      Move to another section…
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setLifecycleAct("withdraw")}>
                      Withdraw…
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setLifecycleAct("graduate")}>
                      Record graduation…
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setLifecycleAct("transferOut")}
                    >
                      Transfer to another school…
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />

      <QuickStats items={statsItems} />

      <div className="space-y-5 pt-2">
        <TabNav tabs={tabs} active={activeTab} onChange={setActiveTab} />

        <div className="min-h-[300px]">
          {activeTab === "overview" && <OverviewTab student={student} />}
          {activeTab === "personal" && <PersonalTab student={student} />}
          {activeTab === "family" && <FamilyTab student={student} />}
          {activeTab === "address" && <AddressTab student={student} />}
          {activeTab === "academic" && <AcademicTab student={student} />}
          {activeTab === "records" && canSeeRecords && (
            <RecordsTab student={student} />
          )}
          {activeTab === "documents" && (
            <StudentDocumentsSection
              studentId={student.id}
              studentName={student.name}
              admissionNumber={student.admission_number}
            />
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

      <StudentLifecycleDialog
        act={lifecycleAct}
        student={{
          id: student.id,
          name: student.name,
          class_id: student.class_id,
        }}
        onOpenChange={(open) => {
          if (!open) setLifecycleAct(null);
        }}
      />

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title={`Delete ${student.name}?`}
        description="This permanently removes the student along with their login, uploaded documents, and fee records. This cannot be undone — to keep the record of a student who has left, use Withdraw, Record graduation or Transfer to another school instead."
        confirmLabel="Delete permanently"
        variant="destructive"
        loading={deleteMutation.isPending}
        onConfirm={performDelete}
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
    </div>
  );
}

// ---------------------------------------------------------------------------
// Records tab — linked module summaries (fees / attendance / transport / hostel).
// Each panel is a separate component so its data query only runs when the
// parent renders it (permission-gated in RecordsTab).
// ---------------------------------------------------------------------------

function CrossLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href}>
      <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
        {label}
        <ExternalLink className="size-3.5" />
      </Button>
    </Link>
  );
}

function readStr(obj: Record<string, unknown> | null | undefined, key: string) {
  const v = obj?.[key];
  return typeof v === "string" || typeof v === "number" ? String(v) : undefined;
}

function RecordsTab({ student }: { student: Student }) {
  const { hasPermission, hasAnyPermission } = useAuth();
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {hasPermission("finance.read") && <FeesPanel student={student} />}
      {hasAnyPermission(["attendance.read.all", "attendance.read.class"]) && (
        <AttendancePanel student={student} />
      )}
      {hasPermission("transport.enrollment.read") && (
        <TransportPanel student={student} />
      )}
      {hasPermission("hostel.read") && <HostelPanel student={student} />}
    </div>
  );
}

function FeesPanel({ student }: { student: Student }) {
  const { data: fees, isLoading } = useStudentFees({ student_id: student.id });
  const totals = useMemo(() => {
    const rows = fees ?? [];
    return rows.reduce(
      (acc, f) => ({
        billed: acc.billed + (f.total_amount ?? 0),
        paid: acc.paid + (f.paid_amount ?? 0),
        outstanding: acc.outstanding + (f.outstanding_amount ?? 0),
      }),
      { billed: 0, paid: 0, outstanding: 0 }
    );
  }, [fees]);

  return (
    <SectionCard
      title="Fees"
      description="Fee assignment summary"
      icon={Wallet}
      actions={<CrossLink href="/finance/student-fees" label="Open fees" />}
    >
      {isLoading ? (
        <PanelLoading />
      ) : !fees || fees.length === 0 ? (
        <PanelEmpty message="No fees assigned for the active academic year." />
      ) : (
        <DetailTable
          rows={[
            ["Fee Records", String(fees.length)],
            ["Total Billed", formatCurrency(totals.billed)],
            ["Paid", formatCurrency(totals.paid)],
            [
              "Outstanding",
              <span
                key="out"
                className={totals.outstanding > 0 ? "font-semibold text-destructive" : undefined}
              >
                {formatCurrency(totals.outstanding)}
              </span>,
            ],
          ]}
        />
      )}
    </SectionCard>
  );
}

function AttendancePanel({ student }: { student: Student }) {
  const month = useMemo(() => new Date().toISOString().slice(0, 7), []);
  const { data, isLoading } = useStudentAttendance(student.id, month);

  return (
    <SectionCard
      title="Attendance"
      description="This month"
      icon={CalendarCheck}
      actions={<CrossLink href="/attendance" label="Open attendance" />}
    >
      {isLoading ? (
        <PanelLoading />
      ) : !data || data.totalDays === 0 ? (
        <PanelEmpty message="No attendance recorded this month." />
      ) : (
        <DetailTable
          rows={[
            ["Days Recorded", String(data.totalDays)],
            ["Present", String(data.present)],
            ["Absent", String(data.absent)],
            ["Late", String(data.late)],
            [
              "Attendance",
              <Badge key="pct" variant={data.percentage >= 75 ? "default" : "destructive"}>
                {data.percentage}%
              </Badge>,
            ],
          ]}
        />
      )}
    </SectionCard>
  );
}

function TransportPanel({ student }: { student: Student }) {
  const t = student.transport;
  const opted = student.is_transport_opted;

  return (
    <SectionCard
      title="Transport"
      description="Route assignment"
      icon={Bus}
      actions={
        <CrossLink href="/dashboard/transport/students" label="Open transport" />
      }
    >
      {!opted && !t ? (
        <PanelEmpty message="Not opted for transport." />
      ) : (
        <DetailTable
          rows={[
            ["Opted", formatBool(opted)],
            ["Route", readStr(t?.route, "name")],
            ["Bus", readStr(t?.bus, "bus_number") ?? readStr(t?.bus, "registration_number")],
            ["Pickup Point", t?.pickup_point ?? undefined],
            ["Drop Point", t?.drop_point ?? undefined],
            [
              "Monthly Fee",
              t?.monthly_fee != null ? formatCurrency(t.monthly_fee) : undefined,
            ],
          ]}
        />
      )}
    </SectionCard>
  );
}

function HostelPanel({ student }: { student: Student }) {
  const { data: allocation, isLoading } = useStudentAllocation(student.id);

  return (
    <SectionCard
      title="Hostel"
      description="Accommodation"
      icon={Building2}
      actions={
        <CrossLink href={`/hostel/students/${student.id}`} label="Open hostel" />
      }
    >
      {isLoading ? (
        <PanelLoading />
      ) : !allocation ? (
        <PanelEmpty message="No active hostel allocation." />
      ) : (
        <DetailTable
          rows={[
            [
              "Status",
              <Badge key="st" variant={getStatusVariant(allocation.status)}>
                {allocation.status}
              </Badge>,
            ],
            ["Checked In", formatDate(allocation.check_in_at)],
            ["Checked Out", formatDate(allocation.check_out_at)],
          ]}
        />
      )}
    </SectionCard>
  );
}

function PanelLoading() {
  return (
    <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin" />
      Loading…
    </div>
  );
}

function PanelEmpty({ message }: { message: string }) {
  return <p className="py-4 text-sm text-muted-foreground">{message}</p>;
}
