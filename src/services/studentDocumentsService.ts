import { apiDelete, apiGet, apiGetBlob, apiPostForm } from "@/services/api";

export interface StudentDocument {
  id: string;
  student_id: string;
  document_type: string;
  document_type_label?: string;
  original_filename: string;
  /** @deprecated Direct URLs are no longer returned — use authenticated viewUrl. */
  cloudinary_url?: string | null;
  /** Path relative to API origin; open via apiGetBlob with auth headers. */
  view_url?: string;
  mime_type?: string;
  file_size_bytes?: number;
  uploaded_by?: { id: string; name: string } | null;
  created_at: string;
}

export const DOCUMENT_TYPES = [
  "aadhar_card",
  "birth_certificate",
  "leaving_certificate",
  "transfer_certificate",
  "passport",
  "other",
] as const;

export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  aadhar_card: "Aadhar Card",
  birth_certificate: "Birth Certificate",
  leaving_certificate: "Leaving Certificate",
  transfer_certificate: "Transfer Certificate",
  passport: "Passport",
  other: "Other",
};

export const studentDocumentsService = {
  getDocuments: async (studentId: string): Promise<StudentDocument[]> => {
    const data = await apiGet<StudentDocument[]>(
      `/api/students/${studentId}/documents`
    );
    return Array.isArray(data) ? data : [];
  },

  uploadDocument: async (
    studentId: string,
    documentType: string,
    file: File
  ): Promise<StudentDocument> => {
    const formData = new FormData();
    formData.append("document_type", documentType);
    formData.append("file", file, file.name);
    return apiPostForm<StudentDocument>(
      `/api/students/${studentId}/documents`,
      formData
    );
  },

  deleteDocument: async (
    studentId: string,
    documentId: string
  ): Promise<void> => {
    await apiDelete(`/api/students/${studentId}/documents/${documentId}`);
  },

  /** Download document bytes (requires session; not a public URL). */
  downloadDocumentBlob: async (
    studentId: string,
    documentId: string
  ): Promise<Blob> => {
    return apiGetBlob(
      `/api/students/${studentId}/documents/${documentId}/file`
    );
  },
};
