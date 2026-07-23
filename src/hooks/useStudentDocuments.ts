"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAppMutation } from "@/hooks/useAppMutation";
import { studentDocumentsService } from "@/services/studentDocumentsService";
import { useAuth } from "@/components/providers/AuthProvider";

export const studentDocumentsKeys = {
  all: (studentId: string) => ["students", studentId, "documents"] as const,
};

export function useStudentDocuments(studentId: string | null) {
  const { tenantId } = useAuth();
  return useQuery({
    queryKey: [...studentDocumentsKeys.all(studentId ?? ""), tenantId],
    queryFn: () => studentDocumentsService.getDocuments(studentId!),
    enabled: !!studentId && !!tenantId,
  });
}

export function useUploadStudentDocument(studentId: string) {
  const queryClient = useQueryClient();
  return useAppMutation(
    {
      mutationFn: ({
        documentType,
        file,
      }: {
        documentType: string;
        file: File;
      }) =>
        studentDocumentsService.uploadDocument(studentId, documentType, file),
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: studentDocumentsKeys.all(studentId),
        });
      },
    },
    { success: "Document uploaded", error: "Couldn't upload the document", retry: true },
  );
}

export function useDeleteStudentDocument(studentId: string) {
  const queryClient = useQueryClient();
  return useAppMutation(
    {
      mutationFn: (documentId: string) =>
        studentDocumentsService.deleteDocument(studentId, documentId),
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: studentDocumentsKeys.all(studentId),
        });
      },
    },
    { success: "Document deleted", error: "Couldn't delete the document", retry: true },
  );
}
