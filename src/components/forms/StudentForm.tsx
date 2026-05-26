"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import type { Student, CreateStudentInput } from "@/types/student";
import type { ClassItem } from "@/services/classesService";
import { StructuredClassPicker } from "@/components/students/StructuredClassPicker";

const optionalString = z.string().optional().or(z.literal(""));
const optionalEmail = z.string().email("Invalid email").optional().or(z.literal(""));
const optionalNumber: z.ZodType<number | undefined> = z
  .preprocess((v) => (v === "" || v == null ? undefined : v), z.coerce.number())
  .optional();
const optionalBoolean: z.ZodType<boolean | undefined> = z
  .preprocess((v) => {
    if (v === "" || v == null) return undefined;
    if (typeof v === "boolean") return v;
    if (v === "true") return true;
    if (v === "false") return false;
    return v;
  }, z.boolean())
  .optional();

const studentSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: optionalEmail,
  guardian_name: z.string().min(1, "Guardian name is required"),
  guardian_relationship: z.string().min(1, "Relationship is required"),
  guardian_phone: z.string().min(1, "Guardian phone is required"),
  guardian_email: optionalEmail,
  class_id: z.string().optional(),
  phone: optionalString,
  date_of_birth: optionalString,
  gender: optionalString,
  address: optionalString,

  // Health / Physical
  blood_group: optionalString,
  height_cm: optionalNumber.optional(),
  weight_kg: optionalNumber.optional(),
  medical_allergies: optionalString,
  medical_conditions: optionalString,
  disability_details: optionalString,
  identification_marks: optionalString,

  // Parent / Family
  father_name: optionalString,
  father_phone: optionalString,
  father_email: optionalEmail,
  father_occupation: optionalString,
  father_annual_income: optionalNumber.optional(),

  mother_name: optionalString,
  mother_phone: optionalString,
  mother_email: optionalEmail,
  mother_occupation: optionalString,
  mother_annual_income: optionalNumber.optional(),

  guardian_address: optionalString,
  guardian_occupation: optionalString,
  guardian_aadhar_number: optionalString,

  // Identity / Demographic
  aadhar_number: optionalString,
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
  current_pincode: optionalString,

  permanent_address: optionalString,
  permanent_city: optionalString,
  permanent_state: optionalString,
  permanent_pincode: optionalString,

  is_same_as_permanent_address: optionalBoolean.optional(),
  is_commuting_from_outstation: optionalBoolean.optional(),
  commute_location: optionalString,
  commute_notes: optionalString,

  // Emergency
  emergency_contact_name: optionalString,
  emergency_contact_relationship: optionalString,
  emergency_contact_phone: optionalString,
  emergency_contact_alt_phone: optionalString,

  // Academic / School internal
  admission_date: optionalString,
  previous_school_name: optionalString,
  previous_school_class: optionalString,
  last_school_board: optionalString,
  tc_number: optionalString,
  house_name: optionalString,
  student_status: optionalString,
});

type StudentFormValues = z.infer<typeof studentSchema>;

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
  const form = useForm<StudentFormValues>({
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
          nationality: "",
          mother_tongue: "",
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

  const handleSubmit = form.handleSubmit(async (values) => {
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
      payload[k] = v as any;
    }

    if (!values.class_id) {
      // Backend requires class_id or academic_year_id - pick first class if none selected
      if (classes.length > 0) payload.class_id = classes[0].id;
    }
    await onSubmit(payload);
  });

  const isSameAsPermanent = form.watch("is_same_as_permanent_address") === true;

  useEffect(() => {
    if (!isSameAsPermanent) return;
    const perm = {
      permanent_address: form.getValues("permanent_address") || "",
      permanent_city: form.getValues("permanent_city") || "",
      permanent_state: form.getValues("permanent_state") || "",
      permanent_pincode: form.getValues("permanent_pincode") || "",
    };
    form.setValue("current_address", perm.permanent_address);
    form.setValue("current_city", perm.permanent_city);
    form.setValue("current_state", perm.permanent_state);
    form.setValue("current_pincode", perm.permanent_pincode);
  }, [isSameAsPermanent, form]);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4 rounded-md border p-4">
        <div className="text-sm font-medium">Basic Info</div>
        <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Full Name *</Label>
          <Input
            id="name"
            {...form.register("name")}
            placeholder="Student full name"
          />
          {form.formState.errors.name && (
            <p className="text-sm text-destructive">
              {form.formState.errors.name.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            {...form.register("email")}
            placeholder="student@example.com"
          />
          {form.formState.errors.email && (
            <p className="text-sm text-destructive">
              {form.formState.errors.email.message}
            </p>
          )}
        </div>

        <div className="space-y-2 sm:col-span-2">
          <StructuredClassPicker
            classes={classes}
            value={form.watch("class_id") || ""}
            onChange={(v) => form.setValue("class_id", v)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="guardian_name">Guardian Name *</Label>
          <Input
            id="guardian_name"
            {...form.register("guardian_name")}
            placeholder="Parent/Guardian name"
          />
          {form.formState.errors.guardian_name && (
            <p className="text-sm text-destructive">
              {form.formState.errors.guardian_name.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="guardian_relationship">Relationship *</Label>
          <Input
            id="guardian_relationship"
            {...form.register("guardian_relationship")}
            placeholder="Father / Mother / Guardian"
          />
          {form.formState.errors.guardian_relationship && (
            <p className="text-sm text-destructive">
              {form.formState.errors.guardian_relationship.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="guardian_phone">Guardian Phone *</Label>
          <Input
            id="guardian_phone"
            {...form.register("guardian_phone")}
            placeholder="+91 9876543210"
          />
          {form.formState.errors.guardian_phone && (
            <p className="text-sm text-destructive">
              {form.formState.errors.guardian_phone.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="guardian_email">Guardian Email</Label>
          <Input
            id="guardian_email"
            type="email"
            {...form.register("guardian_email")}
            placeholder="guardian@example.com"
          />
          {form.formState.errors.guardian_email && (
            <p className="text-sm text-destructive">
              {form.formState.errors.guardian_email.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Student Phone</Label>
          <Input id="phone" {...form.register("phone")} placeholder="Optional" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="date_of_birth">Date of Birth</Label>
          <Input
            id="date_of_birth"
            type="date"
            {...form.register("date_of_birth")}
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
        </div>

        <div className="space-y-2">
          <Label htmlFor="address">Address</Label>
          <Input id="address" {...form.register("address")} placeholder="Full address" />
        </div>
      </div>

      <div className="space-y-4 rounded-md border p-4">
        <div className="text-sm font-medium">Parent / Family Info</div>
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="father_name">Father Name</Label>
            <Input id="father_name" {...form.register("father_name")} placeholder="e.g. Rajesh Kumar" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="father_phone">Father Phone</Label>
            <Input id="father_phone" {...form.register("father_phone")} placeholder="e.g. 9876543210" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="father_email">Father Email</Label>
            <Input id="father_email" type="email" {...form.register("father_email")} placeholder="e.g. father@example.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="father_occupation">Father Occupation</Label>
            <Input id="father_occupation" {...form.register("father_occupation")} placeholder="e.g. Business" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="father_annual_income">Father Annual Income</Label>
            <Input id="father_annual_income" type="number" {...form.register("father_annual_income" as any)} placeholder="e.g. 500000" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mother_name">Mother Name</Label>
            <Input id="mother_name" {...form.register("mother_name")} placeholder="e.g. Sita Kumar" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mother_phone">Mother Phone</Label>
            <Input id="mother_phone" {...form.register("mother_phone")} placeholder="e.g. 9876543210" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mother_email">Mother Email</Label>
            <Input id="mother_email" type="email" {...form.register("mother_email")} placeholder="e.g. mother@example.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mother_occupation">Mother Occupation</Label>
            <Input id="mother_occupation" {...form.register("mother_occupation")} placeholder="e.g. Homemaker" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mother_annual_income">Mother Annual Income</Label>
            <Input id="mother_annual_income" type="number" {...form.register("mother_annual_income" as any)} placeholder="e.g. 300000" />
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="guardian_address">Guardian Address</Label>
            <textarea
              id="guardian_address"
              className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              {...form.register("guardian_address")}
              placeholder="Enter address"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="guardian_occupation">Guardian Occupation</Label>
            <Input id="guardian_occupation" {...form.register("guardian_occupation")} placeholder="Enter occupation" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="guardian_aadhar_number">Guardian Aadhar Number</Label>
            <Input id="guardian_aadhar_number" {...form.register("guardian_aadhar_number")} placeholder="Enter aadhar number" />
          </div>
        </div>
      </div>

      <div className="space-y-4 rounded-md border p-4">
        <div className="text-sm font-medium">Health Info</div>
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="blood_group">Blood Group</Label>
            <Input id="blood_group" {...form.register("blood_group")} placeholder="A+ / O- ..." />
          </div>
          <div className="space-y-2">
            <Label htmlFor="height_cm">Height (cm)</Label>
            <Input id="height_cm" type="number" {...form.register("height_cm" as any)} placeholder="e.g. 140" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="weight_kg">Weight (kg)</Label>
            <Input id="weight_kg" type="number" step="0.01" {...form.register("weight_kg" as any)} placeholder="e.g. 35.5" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="identification_marks">Identification Marks</Label>
            <Input id="identification_marks" {...form.register("identification_marks")} placeholder="e.g. Mole on left cheek" />
          </div>
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="medical_allergies">Medical Allergies</Label>
            <textarea
              id="medical_allergies"
              className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              {...form.register("medical_allergies")}
              placeholder="e.g. Peanuts, dust"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="medical_conditions">Medical Conditions</Label>
            <textarea
              id="medical_conditions"
              className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              {...form.register("medical_conditions")}
              placeholder="e.g. Asthma"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="disability_details">Disability Details</Label>
            <textarea
              id="disability_details"
              className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              {...form.register("disability_details")}
              placeholder="Enter details (if any)"
            />
          </div>
        </div>
      </div>

      <div className="space-y-4 rounded-md border p-4">
        <div className="text-sm font-medium">Identity Info</div>
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="aadhar_number">Aadhar Number</Label>
            <Input id="aadhar_number" {...form.register("aadhar_number")} placeholder="Enter aadhar number" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="apaar_id">APAAR ID</Label>
            <Input id="apaar_id" {...form.register("apaar_id")} placeholder="Enter APAAR ID" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="emis_number">EMIS Number</Label>
            <Input id="emis_number" {...form.register("emis_number")} placeholder="Enter EMIS number" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="udise_student_id">UDISE Student ID</Label>
            <Input id="udise_student_id" {...form.register("udise_student_id")} placeholder="Enter UDISE student ID" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="religion">Religion</Label>
            <Input id="religion" {...form.register("religion")} placeholder="Enter religion" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Input id="category" {...form.register("category")} placeholder="e.g. General / OBC / SC / ST" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="caste">Caste</Label>
            <Input id="caste" {...form.register("caste")} placeholder="Enter caste" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nationality">Nationality</Label>
            <Input id="nationality" {...form.register("nationality")} placeholder="e.g. Indian" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mother_tongue">Mother Tongue</Label>
            <Input id="mother_tongue" {...form.register("mother_tongue")} placeholder="e.g. Gujarati" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="place_of_birth">Place of Birth</Label>
            <Input id="place_of_birth" {...form.register("place_of_birth")} placeholder="e.g. Ahmedabad" />
          </div>
        </div>
      </div>

      <div className="space-y-4 rounded-md border p-4">
        <div className="text-sm font-medium">Residence Info</div>
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="is_same_as_permanent_address">Current address same as permanent?</Label>
            <Select
              value={
                form.watch("is_same_as_permanent_address") === undefined
                  ? ""
                  : String(form.watch("is_same_as_permanent_address"))
              }
              onValueChange={(v) => form.setValue("is_same_as_permanent_address", v === "" ? undefined : (v === "true" ? true : false))}
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
            <Label htmlFor="is_commuting_from_outstation">Commuting from outstation?</Label>
            <Select
              value={
                form.watch("is_commuting_from_outstation") === undefined
                  ? ""
                  : String(form.watch("is_commuting_from_outstation"))
              }
              onValueChange={(v) => form.setValue("is_commuting_from_outstation", v === "" ? undefined : (v === "true" ? true : false))}
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

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="permanent_address">Permanent Address</Label>
            <textarea
              id="permanent_address"
              className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              {...form.register("permanent_address")}
              placeholder="Enter permanent address"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="current_address">Current Address</Label>
            <textarea
              id="current_address"
              className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              {...form.register("current_address")}
              disabled={isSameAsPermanent}
              placeholder="Enter current address"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="permanent_city">Permanent City</Label>
            <Input id="permanent_city" {...form.register("permanent_city")} placeholder="e.g. Surat" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="current_city">Current City</Label>
            <Input id="current_city" {...form.register("current_city")} disabled={isSameAsPermanent} placeholder="e.g. Surat" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="permanent_state">Permanent State</Label>
            <Input id="permanent_state" {...form.register("permanent_state")} placeholder="e.g. Gujarat" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="current_state">Current State</Label>
            <Input id="current_state" {...form.register("current_state")} disabled={isSameAsPermanent} placeholder="e.g. Gujarat" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="permanent_pincode">Permanent Pincode</Label>
            <Input id="permanent_pincode" {...form.register("permanent_pincode")} placeholder="e.g. 395007" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="current_pincode">Current Pincode</Label>
            <Input id="current_pincode" {...form.register("current_pincode")} disabled={isSameAsPermanent} placeholder="e.g. 395007" />
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="commute_location">Commute Location</Label>
            <Input id="commute_location" {...form.register("commute_location")} placeholder="e.g. Vapi" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="commute_notes">Commute Notes</Label>
            <textarea
              id="commute_notes"
              className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              {...form.register("commute_notes")}
              placeholder="Any notes"
            />
          </div>
        </div>
      </div>

      <div className="space-y-4 rounded-md border p-4">
        <div className="text-sm font-medium">Emergency Info</div>
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="emergency_contact_name">Contact Name</Label>
            <Input id="emergency_contact_name" {...form.register("emergency_contact_name")} placeholder="e.g. Uncle name" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="emergency_contact_relationship">Relationship</Label>
            <Input id="emergency_contact_relationship" {...form.register("emergency_contact_relationship")} placeholder="e.g. Uncle" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="emergency_contact_phone">Phone</Label>
            <Input id="emergency_contact_phone" {...form.register("emergency_contact_phone")} placeholder="e.g. 9876543210" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="emergency_contact_alt_phone">Alt Phone</Label>
            <Input id="emergency_contact_alt_phone" {...form.register("emergency_contact_alt_phone")} placeholder="Optional" />
          </div>
        </div>
      </div>

      <div className="space-y-4 rounded-md border p-4">
        <div className="text-sm font-medium">Academic Info</div>
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="admission_date">Admission Date</Label>
            <Input id="admission_date" type="date" {...form.register("admission_date")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="previous_school_name">Previous School Name</Label>
            <Input id="previous_school_name" {...form.register("previous_school_name")} placeholder="Enter school name" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="previous_school_class">Previous School Class</Label>
            <Input id="previous_school_class" {...form.register("previous_school_class")} placeholder="e.g. 5" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="last_school_board">Last School Board</Label>
            <Input id="last_school_board" {...form.register("last_school_board")} placeholder="e.g. CBSE" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tc_number">TC Number</Label>
            <Input id="tc_number" {...form.register("tc_number")} placeholder="Enter TC number" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="house_name">House Name</Label>
            <Input id="house_name" {...form.register("house_name")} placeholder="e.g. Red" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="student_status">Student Status</Label>
            <Input id="student_status" {...form.register("student_status")} placeholder="active / inactive / transferred ..." />
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Saving…" : submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
