"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { financeService } from "@/services/financeService";

export interface StudentFeeFilters {
  student_id?: string;
  fee_structure_id?: string;
  status?: string;
  academic_year_id?: string;
  class_id?: string;
  search?: string;
}

export const studentFeeKeys = {
  all: ["finance", "student-fees"] as const,
  list: (filters?: StudentFeeFilters) =>
    [...studentFeeKeys.all, "list", filters] as const,
  detail: (id: string) => [...studentFeeKeys.all, "detail", id] as const,
};

export function useStudentFees(filters?: StudentFeeFilters) {
  return useQuery({
    queryKey: studentFeeKeys.list(filters),
    queryFn: () => financeService.getStudentFees(filters),
  });
}

export function useStudentFeeDetail(id: string | undefined) {
  return useQuery({
    queryKey: studentFeeKeys.detail(id ?? ""),
    queryFn: () => financeService.getStudentFee(id!),
    enabled: !!id,
  });
}

export function useRecordPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      student_fee_id: string;
      amount: number;
      method?: string;
      reference_number?: string;
      method_detail?: string;
      notes?: string;
      allocations?: { item_id: string; amount: number }[];
    }) => financeService.recordPayment(data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: studentFeeKeys.all });
      qc.invalidateQueries({ queryKey: studentFeeKeys.detail(vars.student_fee_id) });
      qc.invalidateQueries({ queryKey: ["finance", "summary"] });
    },
  });
}

export function useRefundPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ paymentId, notes }: { paymentId: string; notes?: string }) =>
      financeService.refundPayment(paymentId, notes),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: studentFeeKeys.all });
      qc.invalidateQueries({ queryKey: ["finance", "summary"] });
    },
  });
}
