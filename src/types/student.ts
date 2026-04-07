export interface Student {
  id: string;
  user_id?: string;
  name: string;
  email?: string;
  profile_picture?: string;
  admission_number: string;
  academic_year?: string;
  academic_year_id?: string;
  roll_number?: number;
  class_id?: string;
  class_name?: string;
  date_of_birth?: string;
  gender?: string;
  phone?: string;
  address?: string;
  guardian_name?: string;
  guardian_relationship?: string;
  guardian_phone?: string;
  guardian_email?: string;
  // Health / Physical
  blood_group?: string;
  height_cm?: number;
  weight_kg?: number;
  medical_allergies?: string;
  medical_conditions?: string;
  disability_details?: string;
  identification_marks?: string;

  // Parent / Family
  father_name?: string;
  father_phone?: string;
  father_email?: string;
  father_occupation?: string;
  father_annual_income?: number;

  mother_name?: string;
  mother_phone?: string;
  mother_email?: string;
  mother_occupation?: string;
  mother_annual_income?: number;

  guardian_address?: string;
  guardian_occupation?: string;
  guardian_aadhar_number?: string;

  // Identity / Demographic
  aadhar_number?: string;
  apaar_id?: string;
  emis_number?: string;
  udise_student_id?: string;
  religion?: string;
  category?: string;
  caste?: string;
  nationality?: string;
  mother_tongue?: string;
  place_of_birth?: string;

  // Residence / Address
  current_address?: string;
  current_city?: string;
  current_state?: string;
  current_pincode?: string;

  permanent_address?: string;
  permanent_city?: string;
  permanent_state?: string;
  permanent_pincode?: string;

  is_same_as_permanent_address?: boolean;
  is_commuting_from_outstation?: boolean;
  commute_location?: string;
  commute_notes?: string;

  // Emergency
  emergency_contact_name?: string;
  emergency_contact_relationship?: string;
  emergency_contact_phone?: string;
  emergency_contact_alt_phone?: string;

  // Academic / School internal
  admission_date?: string;
  previous_school_name?: string;
  previous_school_class?: string;
  last_school_board?: string;
  tc_number?: string;
  house_name?: string;
  student_status?: string;
  created_at?: string;
}

export interface CreateStudentInput {
  name: string;
  guardian_name: string;
  guardian_relationship: string;
  guardian_phone: string;
  class_id?: string;
  academic_year_id?: string;
  admission_number?: string;
  email?: string;
  phone?: string;
  date_of_birth?: string;
  gender?: string;
  roll_number?: number;
  address?: string;
  guardian_email?: string;

  // Health / Physical
  blood_group?: string;
  height_cm?: number | string;
  weight_kg?: number | string;
  medical_allergies?: string;
  medical_conditions?: string;
  disability_details?: string;
  identification_marks?: string;

  // Parent / Family
  father_name?: string;
  father_phone?: string;
  father_email?: string;
  father_occupation?: string;
  father_annual_income?: number | string;

  mother_name?: string;
  mother_phone?: string;
  mother_email?: string;
  mother_occupation?: string;
  mother_annual_income?: number | string;

  guardian_address?: string;
  guardian_occupation?: string;
  guardian_aadhar_number?: string;

  // Identity / Demographic
  aadhar_number?: string;
  apaar_id?: string;
  emis_number?: string;
  udise_student_id?: string;
  religion?: string;
  category?: string;
  caste?: string;
  nationality?: string;
  mother_tongue?: string;
  place_of_birth?: string;

  // Residence / Address
  current_address?: string;
  current_city?: string;
  current_state?: string;
  current_pincode?: string;

  permanent_address?: string;
  permanent_city?: string;
  permanent_state?: string;
  permanent_pincode?: string;

  is_same_as_permanent_address?: boolean;
  is_commuting_from_outstation?: boolean;
  commute_location?: string;
  commute_notes?: string;

  // Emergency
  emergency_contact_name?: string;
  emergency_contact_relationship?: string;
  emergency_contact_phone?: string;
  emergency_contact_alt_phone?: string;

  // Academic / School internal
  admission_date?: string;
  previous_school_name?: string;
  previous_school_class?: string;
  last_school_board?: string;
  tc_number?: string;
  house_name?: string;
  student_status?: string;
}

export interface UpdateStudentInput extends Partial<CreateStudentInput> {}

export interface CreateStudentResponse {
  student: Student;
  credentials?: {
    username: string;
    email: string;
    password: string;
    must_reset: boolean;
  };
}

// Document types for student documents (must match backend DocumentType enum)
export type DocumentType =
  | "aadhar_card"
  | "birth_certificate"
  | "leaving_certificate"
  | "transfer_certificate"
  | "passport"
  | "other";

export const DOCUMENT_TYPES: DocumentType[] = [
  "aadhar_card",
  "birth_certificate",
  "leaving_certificate",
  "transfer_certificate",
  "passport",
  "other",
];

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  aadhar_card: "Aadhar Card",
  birth_certificate: "Birth Certificate",
  leaving_certificate: "Leaving Certificate",
  transfer_certificate: "Transfer Certificate",
  passport: "Passport",
  other: "Other",
};

export interface StudentDocument {
  id: string;
  student_id: string;
  document_type: string;
  document_type_label?: string;
  original_filename: string;
  /** @deprecated Not exposed — use authenticated file endpoint. */
  cloudinary_url?: string | null;
  /** Relative API path; prefer downloadDocumentBlob(studentId, id). */
  view_url?: string;
  mime_type?: string;
  file_size_bytes?: number;
  uploaded_by?: { id: string; name: string } | null;
  created_at: string;
}
