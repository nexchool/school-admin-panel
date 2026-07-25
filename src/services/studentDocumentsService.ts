import { apiDelete, apiGet, apiGetBlob, apiPostForm } from "@/services/api";

export interface StudentDocument {
  id: string;
  student_id: string;
  document_type: string;
  document_type_label?: string;
  original_filename: string;
  /** @deprecated Direct URLs are no longer returned — use authenticated viewUrl. */
  file_url?: string | null;
  /** Path relative to API origin; open via apiGetBlob with auth headers. */
  view_url?: string;
  mime_type?: string;
  file_size_bytes?: number;
  uploaded_by?: { id: string; name: string } | null;
  created_at: string;
}

/**
 * Upload limits. Mirror of MAX_FILE_SIZE_BYTES / ALLOWED_MIME_TYPES in
 * server/modules/students/services.py — keep the two in step.
 *
 * The client checks these before sending because an oversized body can be cut
 * off by nginx mid-upload, which surfaces in the browser as a bare network
 * failure rather than a 413 the user can act on.
 */
export const MAX_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024;
export const MAX_DOCUMENT_SIZE_LABEL = "10 MB";
export const ALLOWED_DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
] as const;

/** Human-readable size, e.g. "12.4 MB". */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Returns an error message when the file cannot be uploaded, or null when it
 * passes. Size and type only — the server re-checks both.
 */
export function validateDocumentFile(file: File): string | null {
  if (
    !(ALLOWED_DOCUMENT_MIME_TYPES as readonly string[]).includes(file.type)
  ) {
    return "Unsupported file type. Upload a PDF, JPG or PNG.";
  }
  if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
    return `File size ${formatFileSize(file.size)} exceeds the maximum allowed limit of ${MAX_DOCUMENT_SIZE_LABEL}. Please upload a smaller file.`;
  }
  return null;
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
