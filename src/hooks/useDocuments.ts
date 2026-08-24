"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useAppMutation } from "@/hooks/useAppMutation";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  documentsService,
  type DocumentSet,
  type ProfileKind,
} from "@/services/documentsService";

/**
 * Keyed by the profile showing the documents rather than by the person behind
 * it. Two profiles for one human hold the same documents, so a change on one
 * has to reach the other — which is what `personDocuments` as a shared prefix
 * is for: invalidating it clears both.
 */
export const documentKeys = {
  all: ["personDocuments"] as const,
  forProfile: (kind: ProfileKind, profileId: string) =>
    ["personDocuments", kind, profileId] as const,
};

export function useDocuments(kind: ProfileKind, profileId: string | null) {
  const { tenantId } = useAuth();
  return useQuery<DocumentSet>({
    // tenantId last, so the prefix invalidation below still matches across
    // scopes (see .claude/rules/query-conventions.md).
    queryKey: [...documentKeys.forProfile(kind, profileId ?? ""), tenantId],
    queryFn: () => documentsService.get(kind, profileId!),
    enabled: !!profileId && !!tenantId,
  });
}

export function useUploadDocument(kind: ProfileKind, profileId: string) {
  const queryClient = useQueryClient();
  return useAppMutation(
    {
      mutationFn: ({
        documentType,
        file,
      }: {
        documentType: string;
        file: File;
      }) => documentsService.upload(kind, profileId, documentType, file),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: documentKeys.all });
      },
    },
    {
      success: "Document uploaded",
      error: "Couldn't upload the document",
      retry: true,
    },
  );
}

export function useDeleteDocument(kind: ProfileKind, profileId: string) {
  const queryClient = useQueryClient();
  return useAppMutation(
    {
      mutationFn: (documentId: string) =>
        documentsService.remove(kind, profileId, documentId),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: documentKeys.all });
      },
    },
    {
      success: "Document deleted",
      error: "Couldn't delete the document",
      retry: true,
    },
  );
}
