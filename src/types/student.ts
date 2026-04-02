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
