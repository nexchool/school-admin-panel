import { gql } from "@/services/graphql";
import { apiGetBlob, apiPostForm } from "@/services/api";

/**
 * Documents, for whichever profile is showing them.
 *
 * A document belongs to the person, not to the studentship or the employment
 * (server ADR-015), so the student tab and the teacher tab read the same set
 * for someone who is both. What differs is only which profile is asking, which
 * is what `ProfileKind` names.
 *
 * Metadata is GraphQL; the bytes are REST. Upload is multipart and download is
 * an authenticated stream — neither gains anything from going over GraphQL.
 */

export type ProfileKind = "student" | "teacher";

export interface PersonDocument {
  id: string;
  documentType: string;
  documentTypeLabel: string;
  originalFilename: string;
  mimeType: string;
  fileSizeBytes: number;
  /** Path relative to the API origin; fetch with auth, never link directly. */
  viewUrl: string;
  createdAt: string | null;
  uploadedBy: { id: string; name: string } | null;
}

export interface DocumentTypeOption {
  code: string;
  label: string;
  description: string;
  contexts: string[];
}

export interface DocumentCompleteness {
  distinctTypeCount: number;
  minimumRequired: number;
  isSatisfied: boolean;
  /** False when this kind of profile has no requirement at all. */
  isTracked: boolean;
}

export interface DocumentSet {
  documents: PersonDocument[];
  completeness: DocumentCompleteness;
  /** Already narrowed by the server to what this profile may file. */
  availableTypes: DocumentTypeOption[];
}

/**
 * Upload limits. Mirror of the `person` owner kind in
 * `server/modules/documents/registry.py` — keep the two in step.
 *
 * Checked here as well as there because an oversized body can be cut off by
 * nginx mid-upload, which reaches the browser as a bare network failure rather
 * than something the user can act on.
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

/** An error message when the file cannot be uploaded, or null when it passes. */
export function validateDocumentFile(file: File): string | null {
  if (!(ALLOWED_DOCUMENT_MIME_TYPES as readonly string[]).includes(file.type)) {
    return "Unsupported file type. Upload a PDF, JPG or PNG.";
  }
  if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
    return `File size ${formatFileSize(file.size)} exceeds the maximum allowed limit of ${MAX_DOCUMENT_SIZE_LABEL}. Please upload a smaller file.`;
  }
  return null;
}

const DOCUMENT_SET_FIELDS = `
  documents {
    id
    documentType
    documentTypeLabel
    originalFilename
    mimeType
    fileSizeBytes
    viewUrl
    createdAt
    uploadedBy { id name }
  }
  completeness {
    distinctTypeCount
    minimumRequired
    isSatisfied
    isTracked
  }
  availableTypes { code label description contexts }
`;

const STUDENT_DOCUMENTS = `
  query StudentDocuments($studentId: String!) {
    studentDocuments(studentId: $studentId) { ${DOCUMENT_SET_FIELDS} }
  }
`;

const TEACHER_DOCUMENTS = `
  query TeacherDocuments($teacherId: String!) {
    teacherDocuments(teacherId: $teacherId) { ${DOCUMENT_SET_FIELDS} }
  }
`;

const DELETE_STUDENT_DOCUMENT = `
  mutation DeleteStudentDocument($studentId: String!, $documentId: String!) {
    deleteStudentDocument(studentId: $studentId, documentId: $documentId)
  }
`;

const DELETE_TEACHER_DOCUMENT = `
  mutation DeleteTeacherDocument($teacherId: String!, $documentId: String!) {
    deleteTeacherDocument(teacherId: $teacherId, documentId: $documentId)
  }
`;

/** The REST path serving this profile's bytes. */
function basePath(kind: ProfileKind, profileId: string): string {
  return kind === "student"
    ? `/api/students/${profileId}/documents`
    : `/api/teachers/${profileId}/documents`;
}

export const documentsService = {
  get: async (kind: ProfileKind, profileId: string): Promise<DocumentSet> => {
    if (kind === "student") {
      const data = await gql<{ studentDocuments: DocumentSet }>(
        STUDENT_DOCUMENTS,
        { studentId: profileId }
      );
      return data.studentDocuments;
    }
    const data = await gql<{ teacherDocuments: DocumentSet }>(TEACHER_DOCUMENTS, {
      teacherId: profileId,
    });
    return data.teacherDocuments;
  },

  upload: async (
    kind: ProfileKind,
    profileId: string,
    documentType: string,
    file: File
  ): Promise<void> => {
    const formData = new FormData();
    formData.append("document_type", documentType);
    formData.append("file", file, file.name);
    await apiPostForm(basePath(kind, profileId), formData);
  },

  remove: async (
    kind: ProfileKind,
    profileId: string,
    documentId: string
  ): Promise<void> => {
    if (kind === "student") {
      await gql(DELETE_STUDENT_DOCUMENT, {
        studentId: profileId,
        documentId,
      });
      return;
    }
    await gql(DELETE_TEACHER_DOCUMENT, { teacherId: profileId, documentId });
  },

  /** Document bytes. Requires the session — this is not a public URL. */
  downloadBlob: async (
    kind: ProfileKind,
    profileId: string,
    documentId: string
  ): Promise<Blob> => {
    return apiGetBlob(`${basePath(kind, profileId)}/${documentId}/file`);
  },
};
