import { useQueryClient } from "@tanstack/react-query";

import { useAppMutation } from "@/hooks/useAppMutation";
import { useTenantQuery } from "@/hooks/useTenantQuery";
import { examinationsService } from "@/services/examinationsService";
import type {
  CreateExaminationInput,
  Examination,
  ExaminationListFilters,
  CorrectionStatus,
  ExaminationResults,
  MarkCorrection,
  MarkEntry,
  MarkingRegister,
  MarksImportPreview,
  SubjectSet,
  UpdateExaminationInput,
} from "@/types/examination";

export const examinationsKeys = {
  all: ["examinations"] as const,
  list: (filters: ExaminationListFilters) =>
    [...examinationsKeys.all, "list", filters] as const,
  detail: (id: string) => [...examinationsKeys.all, "detail", id] as const,
  types: [...["examinations"], "types"] as const,
  register: (paperId: string) =>
    [...["examinations"], "register", paperId] as const,
  results: (examinationId: string) =>
    [...["examinations"], "results", examinationId] as const,
  corrections: (status: string | null) =>
    [...["examinations"], "corrections", status] as const,
  correctionsForMark: (markId: string) =>
    [...["examinations"], "corrections", "mark", markId] as const,
};

export function useExaminations(filters: ExaminationListFilters) {
  return useTenantQuery({
    queryKey: examinationsKeys.list(filters),
    queryFn: () => examinationsService.list(filters),
  });
}

export function useExamination(id: string | null) {
  return useTenantQuery({
    queryKey: examinationsKeys.detail(id ?? ""),
    queryFn: () => examinationsService.get(id!),
    enabled: !!id,
  });
}

export function useExamTypes() {
  return useTenantQuery({
    queryKey: examinationsKeys.types,
    queryFn: () => examinationsService.examTypes(),
  });
}

/**
 * Prefix invalidation via `all`. The tenant id is the last key segment, so one
 * call reaches every filter combination without naming one.
 */
function invalidate(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: examinationsKeys.all });
}

export function useCreateExamination() {
  const qc = useQueryClient();
  return useAppMutation<Examination, CreateExaminationInput>(
    {
      mutationFn: (input) => examinationsService.create(input),
      onSuccess: () => invalidate(qc),
    },
    { success: "Examination created" },
  );
}

export function useAddExamPapers() {
  const qc = useQueryClient();
  return useAppMutation<
    Examination,
    { examinationId: string; subjectSet: SubjectSet }
  >(
    {
      mutationFn: ({ examinationId, subjectSet }) =>
        examinationsService.addPapers(examinationId, subjectSet),
      onSuccess: () => invalidate(qc),
    },
    { success: "Papers added" },
  );
}

export function useUpdateExamination() {
  const qc = useQueryClient();
  return useAppMutation<
    Examination,
    { id: string; input: UpdateExaminationInput }
  >(
    {
      mutationFn: ({ id, input }) => examinationsService.update(id, input),
      onSuccess: () => invalidate(qc),
    },
    { success: "Examination updated" },
  );
}

export function useScheduleExamination() {
  const qc = useQueryClient();
  return useAppMutation<Examination, string>(
    {
      mutationFn: (id) => examinationsService.schedule(id),
      onSuccess: () => invalidate(qc),
    },
    { success: "Examination scheduled" },
  );
}

export function useCancelExamination() {
  const qc = useQueryClient();
  return useAppMutation<Examination, { id: string; reason: string }>(
    {
      mutationFn: ({ id, reason }) => examinationsService.cancel(id, reason),
      onSuccess: () => invalidate(qc),
    },
    { success: "Examination cancelled" },
  );
}


export function useMarkingRegister(examPaperId: string | null) {
  return useTenantQuery({
    queryKey: examinationsKeys.register(examPaperId ?? ""),
    queryFn: () => examinationsService.markingRegister(examPaperId!),
    enabled: !!examPaperId,
  });
}

export function useRecordMarks(examPaperId: string) {
  const qc = useQueryClient();
  return useAppMutation<MarkingRegister, MarkEntry[]>(
    {
      mutationFn: (rows) => examinationsService.recordMarks(examPaperId, rows),
      onSuccess: () => {
        // Prefix invalidation, not `setQueryData`: `useTenantQuery` appends the
        // tenant id to every key, so writing to the bare key would fill a cache
        // entry nothing reads and leave the screen showing its pre-save state.
        qc.invalidateQueries({ queryKey: examinationsKeys.register(examPaperId) });
        qc.invalidateQueries({ queryKey: examinationsKeys.all });
      },
    },
    { success: "Marks saved" },
  );
}


export function usePreviewMarksSheet(examPaperId: string) {
  return useAppMutation<MarksImportPreview, File>({
    mutationFn: (file) =>
      examinationsService.previewMarksSheet(examPaperId, file),
  });
}

export function useImportMarksSheet(examPaperId: string) {
  const qc = useQueryClient();
  return useAppMutation(
    {
      mutationFn: (file: File) =>
        examinationsService.importMarksSheet(examPaperId, file),
      onSuccess: () => {
        // Prefix invalidation, never a hand-built key: `useTenantQuery` appends
        // the tenant id, so a bare key would fill a cache entry nothing reads
        // (the EX-05 bug).
        qc.invalidateQueries({ queryKey: examinationsKeys.register(examPaperId) });
        qc.invalidateQueries({ queryKey: examinationsKeys.all });
      },
    },
    { success: "Marks imported" },
  );
}


export function useMarkCorrections(
  status: CorrectionStatus | null = "requested",
  options?: { enabled?: boolean },
) {
  return useTenantQuery({
    queryKey: examinationsKeys.corrections(status),
    queryFn: () => examinationsService.markCorrections(status),
    // Gated rather than merely hidden: the queue answers to
    // `assessment.manage`, and asking for it without the key is a request the
    // server will refuse anyway.
    enabled: options?.enabled ?? true,
  });
}

export function useCorrectionsForMark(examMarkId: string | null) {
  return useTenantQuery({
    queryKey: examinationsKeys.correctionsForMark(examMarkId ?? ""),
    queryFn: () => examinationsService.correctionsForMark(examMarkId!),
    enabled: !!examMarkId,
  });
}

/**
 * Prefix invalidation on `all`, never a hand-built key — `useTenantQuery`
 * appends the tenant id, so a bare key fills a cache entry nothing reads.
 */
function invalidateCorrections(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: examinationsKeys.all });
}

export function useRequestMarkCorrection() {
  const qc = useQueryClient();
  return useAppMutation<
    MarkCorrection,
    { examMarkId: string; toStatus: string; toMarks?: number | null; reason: string }
  >(
    {
      mutationFn: (input) => examinationsService.requestMarkCorrection(input),
      onSuccess: () => invalidateCorrections(qc),
    },
    { success: "Correction requested" },
  );
}

export function useDecideMarkCorrection() {
  const qc = useQueryClient();
  return useAppMutation<
    MarkCorrection,
    { correctionId: string; approve: boolean; note?: string | null }
  >(
    {
      mutationFn: ({ correctionId, approve, note }) =>
        approve
          ? examinationsService.approveMarkCorrection(correctionId, note)
          : examinationsService.rejectMarkCorrection(correctionId, note),
      // Both the queue and every register are invalidated: an approved
      // correction moves a mark, so the register showing it is now stale.
      onSuccess: () => invalidateCorrections(qc),
    },
    {
      success: (_data, variables) =>
        variables.approve ? "Correction approved" : "Correction rejected",
    },
  );
}


export function useExaminationResults(examinationId: string | null) {
  return useTenantQuery({
    queryKey: examinationsKeys.results(examinationId ?? ""),
    queryFn: () => examinationsService.examinationResults(examinationId!),
    enabled: !!examinationId,
  });
}

/**
 * One hook for every act that changes a result, because they share an
 * invalidation: publishing moves the examination's status, and revising moves
 * a mark's register. Prefix invalidation on `all` reaches both — never a
 * hand-built key, which would miss the tenant suffix `useTenantQuery` appends.
 */
export function useResultAction(examinationId: string) {
  const qc = useQueryClient();
  return useAppMutation<
    ExaminationResults,
    | { action: "calculate" | "publish" }
    | { action: "revise"; studentId: string; reason: string }
    | { action: "publishRevision"; studentId: string }
  >(
    {
      mutationFn: (input) => {
        if (input.action === "calculate")
          return examinationsService.calculateResults(examinationId);
        if (input.action === "publish")
          return examinationsService.publishResults(examinationId);
        if (input.action === "revise")
          return examinationsService.reviseStudentResult(
            examinationId,
            input.studentId,
            input.reason,
          );
        if (input.action === "publishRevision")
          return examinationsService.publishStudentRevision(
            examinationId,
            input.studentId,
          );
        throw new Error("Unknown result action");
      },
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: examinationsKeys.all });
      },
    },
    {
      success: (_data, variables) =>
        ({
          calculate: "Results calculated",
          publish: "Results published",
          revise: "Result revised",
          publishRevision: "Revised result published",
        })[variables.action],
    },
  );
}
