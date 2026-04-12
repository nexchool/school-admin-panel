import { apiGet, apiPost, apiPut, apiDelete, apiGetBlob, apiGetText } from "@/services/api";

export interface FeeStructure {
  id: string;
  name: string;
  academic_year_id: string;
  due_date: string;
  is_transport_only?: boolean;
  class_ids?: string[];
  class_id?: string | null;
  class_name?: string | null;
  components?: { id?: string; name: string; amount: number; is_optional?: boolean }[];
}

export interface StudentFee {
  id: string;
  student_id: string;
  student_name?: string;
  student_profile_picture?: string;
  admission_number?: string;
  fee_structure_id: string;
  fee_structure_name?: string;
  class_id?: string;
  academic_year_id?: string;
  status: "unpaid" | "partial" | "paid" | "overdue";
  total_amount?: number;
  paid_amount?: number;
  outstanding_amount?: number;
  due_date?: string;
  items?: { id: string; component_name: string; amount: number; paid_amount: number }[];
  payments?: {
    id: string;
    amount: number;
    method: string;
    reference_number?: string;
    notes?: string;
    status?: string;
    created_at: string;
  }[];
}

export interface FinanceSummary {
  total_expected: number;
  total_collected: number;
  total_outstanding: number;
  overdue_count: number;
  recent_payments?: RecentPayment[];
}

export interface RecentPayment {
  id: string;
  amount: number;
  student_name?: string;
  created_at: string;
}

export interface CreateStructureInput {
  name: string;
  academic_year_id: string;
  due_date: string;
  components: { name: string; amount: number; is_optional?: boolean }[];
  class_ids?: string[];
}

function withOutstanding(fee: StudentFee): StudentFee {
  if (fee.outstanding_amount != null) return fee;
  const total = fee.total_amount ?? 0;
  const paid = fee.paid_amount ?? 0;
  return { ...fee, outstanding_amount: Math.max(0, total - paid) };
}

export const financeService = {
  getStructures: async (params?: { academic_year_id?: string; class_id?: string }) => {
    const q = new URLSearchParams();
    if (params?.academic_year_id) q.set("academic_year_id", params.academic_year_id);
    if (params?.class_id) q.set("class_id", params.class_id);
    const url = `/api/finance/structures${q.toString() ? `?${q}` : ""}`;
    const res = await apiGet<{ fee_structures: FeeStructure[] }>(url);
    return res?.fee_structures ?? [];
  },

  getStructure: async (id: string) =>
    apiGet<FeeStructure>(`/api/finance/structures/${id}`),

  getStudentFees: async (params?: {
    student_id?: string;
    fee_structure_id?: string;
    status?: string;
    academic_year_id?: string;
    class_id?: string;
    search?: string;
  }) => {
    const q = new URLSearchParams();
    if (params?.student_id) q.set("student_id", params.student_id);
    if (params?.fee_structure_id) q.set("fee_structure_id", params.fee_structure_id);
    if (params?.status) q.set("status", params.status);
    if (params?.academic_year_id) q.set("academic_year_id", params.academic_year_id);
    if (params?.class_id) q.set("class_id", params.class_id);
    if (params?.search) q.set("search", params.search);
    const url = `/api/finance/student-fees${q.toString() ? `?${q}` : ""}`;
    const res = await apiGet<{ student_fees: StudentFee[] }>(url);
    return (res?.student_fees ?? []).map(withOutstanding);
  },

  getStudentFee: async (id: string) => {
    const fee = await apiGet<StudentFee>(`/api/finance/student-fees/${id}`);
    return fee ? withOutstanding(fee) : null;
  },

  getSummary: async (params?: {
    academic_year_id?: string;
    class_id?: string;
    include_recent_payments?: number;
  }) => {
    const q = new URLSearchParams();
    if (params?.academic_year_id) q.set("academic_year_id", params.academic_year_id);
    if (params?.class_id) q.set("class_id", params.class_id);
    if (params?.include_recent_payments)
      q.set("include_recent_payments", String(params.include_recent_payments));
    return apiGet<FinanceSummary>(
      `/api/finance/summary${q.toString() ? `?${q}` : ""}`
    );
  },

  getRecentPayments: async (limit = 10) => {
    const res = await apiGet<{ recent_payments: RecentPayment[] }>(
      `/api/finance/recent-payments?limit=${limit}`
    );
    return res?.recent_payments ?? [];
  },

  getAvailableClassesForStructure: async (
    academicYearId: string,
    excludeStructureId?: string
  ) => {
    const q = new URLSearchParams({ academic_year_id: academicYearId });
    if (excludeStructureId) q.set("exclude_structure_id", excludeStructureId);
    const res = await apiGet<{ classes: { id: string; name: string; section?: string }[] }>(
      `/api/finance/structures/available-classes?${q}`
    );
    return res?.classes ?? [];
  },

  createStructure: async (data: CreateStructureInput) => {
    const res = await apiPost<{ fee_structure?: FeeStructure }>(
      "/api/finance/structures",
      data
    );
    const fs = (res as { fee_structure?: FeeStructure })?.fee_structure;
    if (!fs) throw new Error("Failed to create fee structure");
    return fs;
  },

  updateStructure: async (id: string, data: Partial<CreateStructureInput>) => {
    const res = await apiPut<{ fee_structure?: FeeStructure }>(
      `/api/finance/structures/${id}`,
      data
    );
    return (res as { fee_structure?: FeeStructure })?.fee_structure ?? res;
  },

  deleteStructure: async (id: string) => apiDelete(`/api/finance/structures/${id}`),

  recordPayment: async (data: {
    student_fee_id: string;
    amount: number;
    method?: string;
    reference_number?: string;
    notes?: string;
  }) => {
    return apiPost("/api/finance/payments", {
      student_fee_id: data.student_fee_id,
      amount: data.amount,
      method: data.method ?? "cash",
      reference_number: data.reference_number ?? null,
      notes: data.notes ?? null,
    });
  },

  refundPayment: async (paymentId: string, notes?: string) =>
    apiPost(`/api/finance/payments/${paymentId}/refund`, { notes }),

  deleteStudentFee: async (feeId: string) =>
    apiDelete(`/api/finance/student-fees/${feeId}`),

  downloadInvoicePdf: async (studentFeeId: string): Promise<Blob> =>
    apiGetBlob(`/api/finance/student-fees/${studentFeeId}/download-invoice`),

  downloadReceiptPdf: async (paymentId: string): Promise<Blob> =>
    apiGetBlob(`/api/finance/payments/${paymentId}/download-receipt`),

  printInvoice: async (studentFeeId: string): Promise<void> => {
    const html = await apiGetText(`/api/finance/student-fees/${studentFeeId}/print-invoice`);
    const blob = new Blob([html], { type: "text/html" });
    const blobUrl = URL.createObjectURL(blob);
    const w = window.open(blobUrl, "_blank");
    if (w) {
      w.onload = () => {
        w.print();
        setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
      };
    } else {
      window.open(blobUrl);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
    }
  },

  printReceipt: async (paymentId: string): Promise<void> => {
    const html = await apiGetText(`/api/finance/payments/${paymentId}/print-receipt`);
    const blob = new Blob([html], { type: "text/html" });
    const blobUrl = URL.createObjectURL(blob);
    const w = window.open(blobUrl, "_blank");
    if (w) {
      w.onload = () => {
        w.print();
        setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
      };
    } else {
      window.open(blobUrl);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
    }
  },
};
