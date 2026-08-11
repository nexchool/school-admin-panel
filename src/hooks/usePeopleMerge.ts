"use client";

import { useQueryClient } from "@tanstack/react-query";

import { useAppMutation } from "@/hooks/useAppMutation";
import { useTenantQuery } from "@/hooks/useTenantQuery";
import { peopleMergeService } from "@/services/peopleMergeService";

export const mergeKeys = {
  all: ["people-merge"] as const,
  suggestions: (limit: number) => [...mergeKeys.all, "suggestions", limit] as const,
};

/**
 * Records that may describe the same human.
 *
 * Computed server-side when asked rather than stored, so the list cannot go
 * stale behind a merge somebody else just made. Not fetched until the screen
 * asks for it — pairing a school's people is real work.
 */
export function useDuplicateSuggestions(limit = 100, enabled = true) {
  return useTenantQuery({
    queryKey: mergeKeys.suggestions(limit),
    queryFn: () => peopleMergeService.suggestions(limit),
    enabled,
    // Recomputed on demand; a stale list would offer a pair that no longer
    // exists and refuse when the operator acted on it.
    staleTime: 0,
  });
}

export function useMergePeople() {
  const queryClient = useQueryClient();
  return useAppMutation(
    {
      mutationFn: (input: { keep: string; absorb: string; reason?: string }) =>
        peopleMergeService.merge(input),
      onSuccess: () => {
        // A merge repoints records across every module at once, so nothing
        // cached about people, students or staff can be trusted afterwards.
        queryClient.invalidateQueries({ queryKey: mergeKeys.all });
        queryClient.invalidateQueries({ queryKey: ["students"] });
        queryClient.invalidateQueries({ queryKey: ["teachers"] });
      },
    },
    {
      success: (result) => `Records combined into ${result.fullName}`,
      error: "Couldn't combine these records",
    },
  );
}
