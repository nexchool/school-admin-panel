"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ChevronDown,
  GraduationCap,
  HeartPulse,
  Home,
  IdCard,
  PhoneCall,
  Sparkles,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
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
import { Combobox } from "@/components/ui/combobox";
import { FieldError } from "@/components/ui/field-error";
import type { Student, CreateStudentInput } from "@/types/student";
import type { ClassItem } from "@/services/classesService";
import { StructuredClassPicker } from "@/components/students/StructuredClassPicker";
import { cn } from "@/lib/utils";
import {
  NATIONALITIES,
  LANGUAGES,
  INDIAN_STATES,
  DEFAULT_NATIONALITY,
  DEFAULT_MOTHER_TONGUE,
} from "@/lib/data/referenceData";
import {
  STUDENT_STATUS_OPTIONS,
  STUDENT_STATUS_VALUES,
} from "@/constants/studentStatus";
import {
  requiredString,
  requiredPhone,
  optionalString,
  optionalEmail,
  optionalPhoneLoose,
  optionalAadhar,
  optionalPincode,
  optionalDate,
  optionalBoolean,
  optionalEnum,
  optionalNumberInRange,
  optionalNonNegativeNumber,
} from "@/lib/validation/fields";

const studentSchema = z.object({
  name: requiredString("Name"),
  email: optionalEmail,
  guardian_name: requiredString("Guardian name"),
  guardian_relationship: requiredString("Relationship"),
  guardian_phone: requiredPhone("Guardian phone"),
  guardian_email: optionalEmail,
  class_id: z.string().optional(),
  phone: optionalPhoneLoose,
  date_of_birth: optionalDate,
  gender: optionalString,
  address: optionalString,

  // Health / Physical
  blood_group: optionalString,
  height_cm: optionalNumberInRange(0, 300, "Height"),
  weight_kg: optionalNumberInRange(0, 500, "Weight"),
  medical_allergies: optionalString,
  medical_conditions: optionalString,
  disability_details: optionalString,
  identification_marks: optionalString,

  // Parent / Family
  father_name: optionalString,
  father_phone: optionalPhoneLoose,
  father_email: optionalEmail,
  father_occupation: optionalString,
  father_annual_income: optionalNonNegativeNumber("Father's annual income"),

  mother_name: optionalString,
  mother_phone: optionalPhoneLoose,
  mother_email: optionalEmail,
  mother_occupation: optionalString,
  mother_annual_income: optionalNonNegativeNumber("Mother's annual income"),

  guardian_address: optionalString,
  guardian_occupation: optionalString,
  guardian_aadhar_number: optionalAadhar,

  // Identity / Demographic
  aadhar_number: optionalAadhar,
  apaar_id: optionalString,
  emis_number: optionalString,
  udise_student_id: optionalString,
  religion: optionalString,
  category: optionalString,
  caste: optionalString,
  nationality: optionalString,
  mother_tongue: optionalString,
  place_of_birth: optionalString,

  // Residence / Address
  current_address: optionalString,
  current_city: optionalString,
  current_state: optionalString,
  current_pincode: optionalPincode,

  permanent_address: optionalString,
  permanent_city: optionalString,
  permanent_state: optionalString,
  permanent_pincode: optionalPincode,

  is_same_as_permanent_address: optionalBoolean,
  is_commuting_from_outstation: optionalBoolean,
  commute_location: optionalString,
  commute_notes: optionalString,

  // Emergency
  emergency_contact_name: optionalString,
  emergency_contact_relationship: optionalString,
  emergency_contact_phone: optionalPhoneLoose,
  emergency_contact_alt_phone: optionalPhoneLoose,

  // Academic / School internal
  admission_date: optionalDate,
  previous_school_name: optionalString,
  previous_school_class: optionalString,
  last_school_board: optionalString,
  tc_number: optionalString,
  house_name: optionalString,
  student_status: optionalEnum(STUDENT_STATUS_VALUES, "student status"),
});

type StudentFormValues = z.infer<typeof studentSchema>;

// ---------------------------------------------------------------------------
// Collapsible sections (presentation only). Content stays MOUNTED when closed
// (hidden via CSS) so react-hook-form registration, values and validation are
// completely unaffected by expanding/collapsing.
// ---------------------------------------------------------------------------

const SECTION_IDS = [
  "personal",
  "family",
  "health",
  "identity",
  "residence",
  "emergency",
  "academic",
] as const;
type SectionId = (typeof SECTION_IDS)[number];

// Where each optional field lives, so a validation error inside a collapsed
// section auto-expands it instead of blocking the submit invisibly.
const FIELD_SECTION: Partial<Record<keyof StudentFormValues, SectionId>> = {
  phone: "personal",
  date_of_birth: "personal",
  gender: "personal",
  address: "personal",

  father_name: "family",
  father_phone: "family",
  father_email: "family",
  father_occupation: "family",
  father_annual_income: "family",
  mother_name: "family",
  mother_phone: "family",
  mother_email: "family",
  mother_occupation: "family",
  mother_annual_income: "family",
  guardian_email: "family",
  guardian_address: "family",
  guardian_occupation: "family",
  guardian_aadhar_number: "family",

  blood_group: "health",
  height_cm: "health",
  weight_kg: "health",
  medical_allergies: "health",
  medical_conditions: "health",
  disability_details: "health",
  identification_marks: "health",

  aadhar_number: "identity",
  apaar_id: "identity",
  emis_number: "identity",
  udise_student_id: "identity",
  religion: "identity",
  category: "identity",
  caste: "identity",
  nationality: "identity",
  mother_tongue: "identity",
  place_of_birth: "identity",

  current_address: "residence",
  current_city: "residence",
  current_state: "residence",
  current_pincode: "residence",
  permanent_address: "residence",
  permanent_city: "residence",
  permanent_state: "residence",
  permanent_pincode: "residence",
  is_same_as_permanent_address: "residence",
  is_commuting_from_outstation: "residence",
  commute_location: "residence",
  commute_notes: "residence",

  emergency_contact_name: "emergency",
  emergency_contact_relationship: "emergency",
  emergency_contact_phone: "emergency",
  emergency_contact_alt_phone: "emergency",

  admission_date: "academic",
  previous_school_name: "academic",
  previous_school_class: "academic",
  last_school_board: "academic",
  tc_number: "academic",
  house_name: "academic",
  student_status: "academic",
};

const TEXTAREA_CLASS =
  "min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm";

function RequiredMark() {
  return (
    <span aria-hidden className="text-destructive">
      *
    </span>
  );
}

function FormSection({
  title,
  description,
  icon: Icon,
  open,
  onToggle,
  children,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50"
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Icon className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">{title}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {description}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180"
          )}
        />
      </button>
      {/* Hidden, not unmounted — keeps RHF state and validation intact. */}
      <div
        className={cn("border-t border-border px-4 py-4", !open && "hidden")}
      >
        {children}
      </div>
    </section>
  );
}

interface StudentFormProps {
  initialData?: Student;
  classes: ClassItem[];
  onSubmit: (data: CreateStudentInput) => Promise<void>;
  onCancel?: () => void;
  submitLabel?: string;
}

export function StudentForm({
  initialData,
  classes,
  onSubmit,
  onCancel,
  submitLabel = "Create Student",
}: StudentFormProps) {
  // Quick-add: everything beyond the essentials starts collapsed. When
  // editing, open every section so existing data is visible at a glance.
  const [openSections, setOpenSections] = useState<Set<SectionId>>(
    () => new Set<SectionId>(initialData ? SECTION_IDS : [])
  );

  const toggleSection = (id: SectionId) =>
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const form = useForm<StudentFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- zodResolver's inferred input/output types diverge on optional number fields
    resolver: zodResolver(studentSchema) as any,
    defaultValues: initialData
      ? {
          name: initialData.name,
          email: initialData.email ?? "",
          guardian_name: initialData.guardian_name ?? "",
          guardian_relationship: initialData.guardian_relationship ?? "",
          guardian_phone: initialData.guardian_phone ?? "",
          guardian_email: initialData.guardian_email ?? "",
          class_id: initialData.class_id ?? "",
          phone: initialData.phone ?? "",
          date_of_birth: initialData.date_of_birth ?? "",
          gender: initialData.gender ?? "",
          address: initialData.address ?? "",

          blood_group: initialData.blood_group ?? "",
          height_cm: initialData.height_cm ?? undefined,
          weight_kg: initialData.weight_kg ?? undefined,
          medical_allergies: initialData.medical_allergies ?? "",
          medical_conditions: initialData.medical_conditions ?? "",
          disability_details: initialData.disability_details ?? "",
          identification_marks: initialData.identification_marks ?? "",

          father_name: initialData.father_name ?? "",
          father_phone: initialData.father_phone ?? "",
          father_email: initialData.father_email ?? "",
          father_occupation: initialData.father_occupation ?? "",
          father_annual_income: initialData.father_annual_income ?? undefined,

          mother_name: initialData.mother_name ?? "",
          mother_phone: initialData.mother_phone ?? "",
          mother_email: initialData.mother_email ?? "",
          mother_occupation: initialData.mother_occupation ?? "",
          mother_annual_income: initialData.mother_annual_income ?? undefined,

          guardian_address: initialData.guardian_address ?? "",
          guardian_occupation: initialData.guardian_occupation ?? "",
          guardian_aadhar_number: initialData.guardian_aadhar_number ?? "",

          aadhar_number: initialData.aadhar_number ?? "",
          apaar_id: initialData.apaar_id ?? "",
          emis_number: initialData.emis_number ?? "",
          udise_student_id: initialData.udise_student_id ?? "",
          religion: initialData.religion ?? "",
          category: initialData.category ?? "",
          caste: initialData.caste ?? "",
          nationality: initialData.nationality ?? "",
          mother_tongue: initialData.mother_tongue ?? "",
          place_of_birth: initialData.place_of_birth ?? "",

          current_address: initialData.current_address ?? "",
          current_city: initialData.current_city ?? "",
          current_state: initialData.current_state ?? "",
          current_pincode: initialData.current_pincode ?? "",

          permanent_address: initialData.permanent_address ?? "",
          permanent_city: initialData.permanent_city ?? "",
          permanent_state: initialData.permanent_state ?? "",
          permanent_pincode: initialData.permanent_pincode ?? "",

          is_same_as_permanent_address:
            initialData.is_same_as_permanent_address ?? undefined,
          is_commuting_from_outstation:
            initialData.is_commuting_from_outstation ?? undefined,
          commute_location: initialData.commute_location ?? "",
          commute_notes: initialData.commute_notes ?? "",

          emergency_contact_name: initialData.emergency_contact_name ?? "",
          emergency_contact_relationship:
            initialData.emergency_contact_relationship ?? "",
          emergency_contact_phone: initialData.emergency_contact_phone ?? "",
          emergency_contact_alt_phone:
            initialData.emergency_contact_alt_phone ?? "",

          admission_date: initialData.admission_date ?? "",
          previous_school_name: initialData.previous_school_name ?? "",
          previous_school_class: initialData.previous_school_class ?? "",
          last_school_board: initialData.last_school_board ?? "",
          tc_number: initialData.tc_number ?? "",
          house_name: initialData.house_name ?? "",
          student_status: initialData.student_status ?? "",
        }
      : {
          name: "",
          email: "",
          guardian_name: "",
          guardian_relationship: "",
          guardian_phone: "",
          guardian_email: "",
          class_id: "",
          phone: "",
          date_of_birth: "",
          gender: "",
          address: "",

          blood_group: "",
          height_cm: undefined,
          weight_kg: undefined,
          medical_allergies: "",
          medical_conditions: "",
          disability_details: "",
          identification_marks: "",

          father_name: "",
          father_phone: "",
          father_email: "",
          father_occupation: "",
          father_annual_income: undefined,

          mother_name: "",
          mother_phone: "",
          mother_email: "",
          mother_occupation: "",
          mother_annual_income: undefined,

          guardian_address: "",
          guardian_occupation: "",
          guardian_aadhar_number: "",

          aadhar_number: "",
          apaar_id: "",
          emis_number: "",
          udise_student_id: "",
          religion: "",
          category: "",
          caste: "",
          nationality: DEFAULT_NATIONALITY,
          mother_tongue: DEFAULT_MOTHER_TONGUE,
          place_of_birth: "",

          current_address: "",
          current_city: "",
          current_state: "",
          current_pincode: "",

          permanent_address: "",
          permanent_city: "",
          permanent_state: "",
          permanent_pincode: "",

          is_same_as_permanent_address: undefined,
          is_commuting_from_outstation: undefined,
          commute_location: "",
          commute_notes: "",

          emergency_contact_name: "",
          emergency_contact_relationship: "",
          emergency_contact_phone: "",
          emergency_contact_alt_phone: "",

          admission_date: "",
          previous_school_name: "",
          previous_school_class: "",
          last_school_board: "",
          tc_number: "",
          house_name: "",
          student_status: "",
        },
  });

  const handleSubmit = form.handleSubmit(
    async (values) => {
      const payload: CreateStudentInput = {
        name: values.name,
        guardian_name: values.guardian_name,
        guardian_relationship: values.guardian_relationship,
        guardian_phone: values.guardian_phone,
      };
      if (values.email) payload.email = values.email;
      if (values.guardian_email) payload.guardian_email = values.guardian_email;
      if (values.class_id) payload.class_id = values.class_id;
      if (values.phone) payload.phone = values.phone;
      if (values.date_of_birth) payload.date_of_birth = values.date_of_birth;
      if (values.gender) payload.gender = values.gender;
      if (values.address) payload.address = values.address;

      // Extended fields (only include when set)
      const extKeys: (keyof StudentFormValues)[] = [
        "blood_group",
        "height_cm",
        "weight_kg",
        "medical_allergies",
        "medical_conditions",
        "disability_details",
        "identification_marks",
        "father_name",
        "father_phone",
        "father_email",
        "father_occupation",
        "father_annual_income",
        "mother_name",
        "mother_phone",
        "mother_email",
        "mother_occupation",
        "mother_annual_income",
        "guardian_address",
        "guardian_occupation",
        "guardian_aadhar_number",
        "aadhar_number",
        "apaar_id",
        "emis_number",
        "udise_student_id",
        "religion",
        "category",
        "caste",
        "nationality",
        "mother_tongue",
        "place_of_birth",
        "current_address",
        "current_city",
        "current_state",
        "current_pincode",
        "permanent_address",
        "permanent_city",
        "permanent_state",
        "permanent_pincode",
        "is_same_as_permanent_address",
        "is_commuting_from_outstation",
        "commute_location",
        "commute_notes",
        "emergency_contact_name",
        "emergency_contact_relationship",
        "emergency_contact_phone",
        "emergency_contact_alt_phone",
        "admission_date",
        "previous_school_name",
        "previous_school_class",
        "last_school_board",
        "tc_number",
        "house_name",
        "student_status",
      ];
      for (const k of extKeys) {
        const v = values[k];
        if (v === undefined || v === null) continue;
        if (typeof v === "string" && v.trim() === "") continue;
        // @ts-expect-error - payload is open to extended optional keys
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- see above
        payload[k] = v as any;
      }

      if (!values.class_id) {
        // Backend requires class_id or academic_year_id - pick first class if none selected
        if (classes.length > 0) payload.class_id = classes[0].id;
      }
      await onSubmit(payload);
    }
  );

  // Any section holding a field with a validation error is force-expanded (and
  // can't be collapsed while the error stands) so a submit is never blocked by
  // an invisible field. Derived from formState so it stays correct on every
  // render without an imperative callback.
  const erroredSections = new Set<SectionId>();
  for (const key of Object.keys(form.formState.errors) as (keyof StudentFormValues)[]) {
    const section = FIELD_SECTION[key];
    if (section) erroredSections.add(section);
  }
  const isSectionOpen = (id: SectionId) =>
    openSections.has(id) || erroredSections.has(id);

  // If an existing student carries a legacy, non-canonical status (the field
  // used to be free text), surface it as an option so the edit dropdown shows
  // the real value instead of an empty box — the admin can then re-pick a
  // canonical status (required, since both FE and BE now validate the enum).
  const legacyStatus =
    initialData?.student_status &&
    !STUDENT_STATUS_VALUES.includes(initialData.student_status)
      ? initialData.student_status
      : null;

  const isSameAsPermanent = form.watch("is_same_as_permanent_address") === true;
  // Watch the permanent fields too — otherwise, with "same as permanent" on,
  // editing a permanent field after toggling left the (disabled) current fields
  // stale and saved the wrong current address.
  const permAddress = form.watch("permanent_address");
  const permCity = form.watch("permanent_city");
  const permState = form.watch("permanent_state");
  const permPincode = form.watch("permanent_pincode");

  useEffect(() => {
    if (!isSameAsPermanent) return;
    form.setValue("current_address", permAddress || "");
    form.setValue("current_city", permCity || "");
    form.setValue("current_state", permState || "");
    form.setValue("current_pincode", permPincode || "");
  }, [isSameAsPermanent, permAddress, permCity, permState, permPincode, form]);

  return (
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-3.5 overflow-y-auto px-6 py-5">
        {/* Essentials — everything needed for a quick add, always visible. */}
        <section className="rounded-xl border border-primary/25 bg-primary/[0.04]">
          <div className="flex items-center gap-3 px-4 pt-4">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Sparkles className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold">Essentials</p>
              <p className="text-xs text-muted-foreground">
                Only these are needed to create the student.
              </p>
            </div>
          </div>
          <div className="grid gap-4 px-4 pb-4 pt-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">
                Full Name <RequiredMark />
              </Label>
              <Input
                id="name"
                {...form.register("name")}
                placeholder="Student full name"
              />
              <FieldError message={form.formState.errors.name?.message} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                {...form.register("email")}
                placeholder="student@example.com"
              />
              <FieldError message={form.formState.errors.email?.message} />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <StructuredClassPicker
                classes={classes}
                value={form.watch("class_id") || ""}
                onChange={(v) => form.setValue("class_id", v)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="guardian_name">
                Guardian Name <RequiredMark />
              </Label>
              <Input
                id="guardian_name"
                {...form.register("guardian_name")}
                placeholder="Parent/Guardian name"
              />
              <FieldError
                message={form.formState.errors.guardian_name?.message}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="guardian_relationship">
                Relationship <RequiredMark />
              </Label>
              <Input
                id="guardian_relationship"
                {...form.register("guardian_relationship")}
                placeholder="Father / Mother / Guardian"
              />
              <FieldError
                message={form.formState.errors.guardian_relationship?.message}
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="guardian_phone">
                Guardian Phone <RequiredMark />
              </Label>
              <Input
                id="guardian_phone"
                {...form.register("guardian_phone")}
                placeholder="+91 9876543210"
              />
              <FieldError
                message={form.formState.errors.guardian_phone?.message}
              />
            </div>
          </div>
        </section>

        <FormSection
          title="Personal details"
          description="Phone, birth date, gender and address"
          icon={UserRound}
          open={isSectionOpen("personal")}
          onToggle={() => toggleSection("personal")}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="phone">Student Phone</Label>
              <Input
                id="phone"
                {...form.register("phone")}
                placeholder="Optional"
              />
              <FieldError message={form.formState.errors.phone?.message} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date_of_birth">Date of Birth</Label>
              <Input
                id="date_of_birth"
                type="date"
                {...form.register("date_of_birth")}
              />
              <FieldError
                message={form.formState.errors.date_of_birth?.message}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gender">Gender</Label>
              <Select
                value={form.watch("gender") || ""}
                onValueChange={(v) => form.setValue("gender", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                {...form.register("address")}
                placeholder="Full address"
              />
            </div>
          </div>
        </FormSection>

        <FormSection
          title="Parents & guardian"
          description="Father, mother and guardian details"
          icon={Users}
          open={isSectionOpen("family")}
          onToggle={() => toggleSection("family")}
        >
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="father_name">Father Name</Label>
                <Input
                  id="father_name"
                  {...form.register("father_name")}
                  placeholder="e.g. Rajesh Kumar"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="father_phone">Father Phone</Label>
                <Input
                  id="father_phone"
                  {...form.register("father_phone")}
                  placeholder="e.g. 9876543210"
                />
                <FieldError
                  message={form.formState.errors.father_phone?.message}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="father_email">Father Email</Label>
                <Input
                  id="father_email"
                  type="email"
                  {...form.register("father_email")}
                  placeholder="e.g. father@example.com"
                />
                <FieldError
                  message={form.formState.errors.father_email?.message}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="father_occupation">Father Occupation</Label>
                <Input
                  id="father_occupation"
                  {...form.register("father_occupation")}
                  placeholder="e.g. Business"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="father_annual_income">
                  Father Annual Income
                </Label>
                <Input
                  id="father_annual_income"
                  type="number"
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- number field registered as string input; zod coerces
                  {...form.register("father_annual_income" as any)}
                  placeholder="e.g. 500000"
                />
                <FieldError
                  message={form.formState.errors.father_annual_income?.message}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="mother_name">Mother Name</Label>
                <Input
                  id="mother_name"
                  {...form.register("mother_name")}
                  placeholder="e.g. Sita Kumar"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mother_phone">Mother Phone</Label>
                <Input
                  id="mother_phone"
                  {...form.register("mother_phone")}
                  placeholder="e.g. 9876543210"
                />
                <FieldError
                  message={form.formState.errors.mother_phone?.message}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mother_email">Mother Email</Label>
                <Input
                  id="mother_email"
                  type="email"
                  {...form.register("mother_email")}
                  placeholder="e.g. mother@example.com"
                />
                <FieldError
                  message={form.formState.errors.mother_email?.message}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mother_occupation">Mother Occupation</Label>
                <Input
                  id="mother_occupation"
                  {...form.register("mother_occupation")}
                  placeholder="e.g. Homemaker"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mother_annual_income">
                  Mother Annual Income
                </Label>
                <Input
                  id="mother_annual_income"
                  type="number"
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- number field registered as string input; zod coerces
                  {...form.register("mother_annual_income" as any)}
                  placeholder="e.g. 300000"
                />
                <FieldError
                  message={form.formState.errors.mother_annual_income?.message}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="guardian_email">Guardian Email</Label>
                <Input
                  id="guardian_email"
                  type="email"
                  {...form.register("guardian_email")}
                  placeholder="guardian@example.com"
                />
                <FieldError
                  message={form.formState.errors.guardian_email?.message}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="guardian_occupation">Guardian Occupation</Label>
                <Input
                  id="guardian_occupation"
                  {...form.register("guardian_occupation")}
                  placeholder="Enter occupation"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="guardian_aadhar_number">
                  Guardian Aadhar Number
                </Label>
                <Input
                  id="guardian_aadhar_number"
                  {...form.register("guardian_aadhar_number")}
                  placeholder="Enter aadhar number"
                />
                <FieldError
                  message={
                    form.formState.errors.guardian_aadhar_number?.message
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="guardian_address">Guardian Address</Label>
                <textarea
                  id="guardian_address"
                  className={TEXTAREA_CLASS}
                  {...form.register("guardian_address")}
                  placeholder="Enter address"
                />
              </div>
            </div>
          </div>
        </FormSection>

        <FormSection
          title="Health"
          description="Blood group, measurements and medical notes"
          icon={HeartPulse}
          open={isSectionOpen("health")}
          onToggle={() => toggleSection("health")}
        >
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="blood_group">Blood Group</Label>
                <Input
                  id="blood_group"
                  {...form.register("blood_group")}
                  placeholder="A+ / O- ..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="height_cm">Height (cm)</Label>
                <Input
                  id="height_cm"
                  type="number"
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- number field registered as string input; zod coerces
                  {...form.register("height_cm" as any)}
                  placeholder="e.g. 140"
                />
                <FieldError
                  message={form.formState.errors.height_cm?.message}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="weight_kg">Weight (kg)</Label>
                <Input
                  id="weight_kg"
                  type="number"
                  step="0.01"
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- number field registered as string input; zod coerces
                  {...form.register("weight_kg" as any)}
                  placeholder="e.g. 35.5"
                />
                <FieldError
                  message={form.formState.errors.weight_kg?.message}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="identification_marks">
                  Identification Marks
                </Label>
                <Input
                  id="identification_marks"
                  {...form.register("identification_marks")}
                  placeholder="e.g. Mole on left cheek"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="medical_allergies">Medical Allergies</Label>
                <textarea
                  id="medical_allergies"
                  className={TEXTAREA_CLASS}
                  {...form.register("medical_allergies")}
                  placeholder="e.g. Peanuts, dust"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="medical_conditions">Medical Conditions</Label>
                <textarea
                  id="medical_conditions"
                  className={TEXTAREA_CLASS}
                  {...form.register("medical_conditions")}
                  placeholder="e.g. Asthma"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="disability_details">Disability Details</Label>
                <textarea
                  id="disability_details"
                  className={TEXTAREA_CLASS}
                  {...form.register("disability_details")}
                  placeholder="Enter details (if any)"
                />
              </div>
            </div>
          </div>
        </FormSection>

        <FormSection
          title="Identity"
          description="Government IDs and demographics"
          icon={IdCard}
          open={isSectionOpen("identity")}
          onToggle={() => toggleSection("identity")}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="aadhar_number">Aadhar Number</Label>
              <Input
                id="aadhar_number"
                {...form.register("aadhar_number")}
                placeholder="Enter aadhar number"
              />
              <FieldError
                message={form.formState.errors.aadhar_number?.message}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="apaar_id">APAAR ID</Label>
              <Input
                id="apaar_id"
                {...form.register("apaar_id")}
                placeholder="Enter APAAR ID"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emis_number">EMIS Number</Label>
              <Input
                id="emis_number"
                {...form.register("emis_number")}
                placeholder="Enter EMIS number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="udise_student_id">UDISE Student ID</Label>
              <Input
                id="udise_student_id"
                {...form.register("udise_student_id")}
                placeholder="Enter UDISE student ID"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="religion">Religion</Label>
              <Input
                id="religion"
                {...form.register("religion")}
                placeholder="Enter religion"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                {...form.register("category")}
                placeholder="e.g. General / OBC / SC / ST"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="caste">Caste</Label>
              <Input
                id="caste"
                {...form.register("caste")}
                placeholder="Enter caste"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nationality">Nationality</Label>
              <Combobox
                id="nationality"
                options={NATIONALITIES}
                value={form.watch("nationality") || ""}
                onChange={(val) =>
                  form.setValue("nationality", val, { shouldValidate: true })
                }
                allowCustom
                placeholder="Select nationality"
                searchPlaceholder="Search nationality…"
              />
              <FieldError
                message={form.formState.errors.nationality?.message}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mother_tongue">Mother Tongue</Label>
              <Combobox
                id="mother_tongue"
                options={LANGUAGES}
                value={form.watch("mother_tongue") || ""}
                onChange={(val) =>
                  form.setValue("mother_tongue", val, { shouldValidate: true })
                }
                allowCustom
                placeholder="Select mother tongue"
                searchPlaceholder="Search language…"
              />
              <FieldError
                message={form.formState.errors.mother_tongue?.message}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="place_of_birth">Place of Birth</Label>
              <Input
                id="place_of_birth"
                {...form.register("place_of_birth")}
                placeholder="e.g. Ahmedabad"
              />
            </div>
          </div>
        </FormSection>

        <FormSection
          title="Residence"
          description="Permanent and current address"
          icon={Home}
          open={isSectionOpen("residence")}
          onToggle={() => toggleSection("residence")}
        >
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="is_same_as_permanent_address">
                  Current address same as permanent?
                </Label>
                <Select
                  value={
                    form.watch("is_same_as_permanent_address") === undefined
                      ? ""
                      : String(form.watch("is_same_as_permanent_address"))
                  }
                  onValueChange={(v) =>
                    form.setValue(
                      "is_same_as_permanent_address",
                      v === "" ? undefined : v === "true" ? true : false
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Yes</SelectItem>
                    <SelectItem value="false">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="is_commuting_from_outstation">
                  Commuting from outstation?
                </Label>
                <Select
                  value={
                    form.watch("is_commuting_from_outstation") === undefined
                      ? ""
                      : String(form.watch("is_commuting_from_outstation"))
                  }
                  onValueChange={(v) =>
                    form.setValue(
                      "is_commuting_from_outstation",
                      v === "" ? undefined : v === "true" ? true : false
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Yes</SelectItem>
                    <SelectItem value="false">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="permanent_address">Permanent Address</Label>
                <textarea
                  id="permanent_address"
                  className={TEXTAREA_CLASS}
                  {...form.register("permanent_address")}
                  placeholder="Enter permanent address"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="current_address">Current Address</Label>
                <textarea
                  id="current_address"
                  className={TEXTAREA_CLASS}
                  {...form.register("current_address")}
                  disabled={isSameAsPermanent}
                  placeholder="Enter current address"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="permanent_city">Permanent City</Label>
                <Input
                  id="permanent_city"
                  {...form.register("permanent_city")}
                  placeholder="e.g. Surat"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="current_city">Current City</Label>
                <Input
                  id="current_city"
                  {...form.register("current_city")}
                  disabled={isSameAsPermanent}
                  placeholder="e.g. Surat"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="permanent_state">Permanent State</Label>
                <Combobox
                  id="permanent_state"
                  options={INDIAN_STATES}
                  value={form.watch("permanent_state") || ""}
                  onChange={(val) =>
                    form.setValue("permanent_state", val, {
                      shouldValidate: true,
                    })
                  }
                  allowCustom
                  placeholder="Select state"
                  searchPlaceholder="Search state…"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="current_state">Current State</Label>
                <Combobox
                  id="current_state"
                  options={INDIAN_STATES}
                  value={form.watch("current_state") || ""}
                  onChange={(val) =>
                    form.setValue("current_state", val, {
                      shouldValidate: true,
                    })
                  }
                  allowCustom
                  disabled={isSameAsPermanent}
                  placeholder="Select state"
                  searchPlaceholder="Search state…"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="permanent_pincode">Permanent Pincode</Label>
                <Input
                  id="permanent_pincode"
                  {...form.register("permanent_pincode")}
                  placeholder="e.g. 395007"
                />
                <FieldError
                  message={form.formState.errors.permanent_pincode?.message}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="current_pincode">Current Pincode</Label>
                <Input
                  id="current_pincode"
                  {...form.register("current_pincode")}
                  disabled={isSameAsPermanent}
                  placeholder="e.g. 395007"
                />
                <FieldError
                  message={form.formState.errors.current_pincode?.message}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="commute_location">Commute Location</Label>
                <Input
                  id="commute_location"
                  {...form.register("commute_location")}
                  placeholder="e.g. Vapi"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="commute_notes">Commute Notes</Label>
                <textarea
                  id="commute_notes"
                  className={TEXTAREA_CLASS}
                  {...form.register("commute_notes")}
                  placeholder="Any notes"
                />
              </div>
            </div>
          </div>
        </FormSection>

        <FormSection
          title="Emergency contact"
          description="Who to call in an emergency"
          icon={PhoneCall}
          open={isSectionOpen("emergency")}
          onToggle={() => toggleSection("emergency")}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="emergency_contact_name">Contact Name</Label>
              <Input
                id="emergency_contact_name"
                {...form.register("emergency_contact_name")}
                placeholder="e.g. Uncle name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emergency_contact_relationship">
                Relationship
              </Label>
              <Input
                id="emergency_contact_relationship"
                {...form.register("emergency_contact_relationship")}
                placeholder="e.g. Uncle"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emergency_contact_phone">Phone</Label>
              <Input
                id="emergency_contact_phone"
                {...form.register("emergency_contact_phone")}
                placeholder="e.g. 9876543210"
              />
              <FieldError
                message={form.formState.errors.emergency_contact_phone?.message}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emergency_contact_alt_phone">Alt Phone</Label>
              <Input
                id="emergency_contact_alt_phone"
                {...form.register("emergency_contact_alt_phone")}
                placeholder="Optional"
              />
              <FieldError
                message={
                  form.formState.errors.emergency_contact_alt_phone?.message
                }
              />
            </div>
          </div>
        </FormSection>

        <FormSection
          title="Academic"
          description="Admission and previous school"
          icon={GraduationCap}
          open={isSectionOpen("academic")}
          onToggle={() => toggleSection("academic")}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="admission_date">Admission Date</Label>
              <Input
                id="admission_date"
                type="date"
                {...form.register("admission_date")}
              />
              <FieldError
                message={form.formState.errors.admission_date?.message}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="previous_school_name">Previous School Name</Label>
              <Input
                id="previous_school_name"
                {...form.register("previous_school_name")}
                placeholder="Enter school name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="previous_school_class">
                Previous School Class
              </Label>
              <Input
                id="previous_school_class"
                {...form.register("previous_school_class")}
                placeholder="e.g. 5"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_school_board">Last School Board</Label>
              <Input
                id="last_school_board"
                {...form.register("last_school_board")}
                placeholder="e.g. CBSE"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tc_number">TC Number</Label>
              <Input
                id="tc_number"
                {...form.register("tc_number")}
                placeholder="Enter TC number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="house_name">House Name</Label>
              <Input
                id="house_name"
                {...form.register("house_name")}
                placeholder="e.g. Red"
              />
            </div>
            {initialData && (
              <div className="space-y-2">
                <Label htmlFor="student_status">Student Status</Label>
                <Select
                  value={form.watch("student_status") || ""}
                  onValueChange={(val) =>
                    form.setValue("student_status", val, {
                      shouldValidate: true,
                    })
                  }
                >
                  <SelectTrigger id="student_status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {legacyStatus && (
                      <SelectItem value={legacyStatus}>
                        {legacyStatus} (legacy)
                      </SelectItem>
                    )}
                    {STUDENT_STATUS_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError
                  message={form.formState.errors.student_status?.message}
                />
              </div>
            )}
          </div>
        </FormSection>
      </div>

      <div className="flex shrink-0 items-center gap-3 border-t border-border bg-background px-6 py-4">
        <p className="mr-auto text-xs text-muted-foreground">
          <RequiredMark /> Required fields
        </p>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
