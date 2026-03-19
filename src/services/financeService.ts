import { apiGet, apiPost, apiPut, apiDelete, apiGetBlob, apiGetText } from "@/services/api";

export interface FeeStructure {
  id: string;
  name: string;
  academic_year_id: string;
  due_date: string;
  class_ids?: string[];
  class_id?: string | null;
  class_name?: string | null;
  components?: { name: string; amount: number; is_optional?: boolean }[];
}

export interface StudentFee {
  id: string;
  student_id: string;
  student_name?: string;
  fee_structure_id: string;
  fee_structure_name?: string;
  status: string;
  total_amount?: number;
  paid_amount?: number;
  outstanding_amount?: number;
  due_date?: string;
  items?: { id: string; component_name: string; amount: number; paid_amount: number }[];
  payments?: { id: string; amount: number; method: string; created_at: string }[];
}

export interface CreateStructureInput {
  name: string;
  academic_year_id: string;
  due_date: string;
  components: { name: string; amount: number; is_optional?: boolean }[];
  class_ids?: string[];
}

export const financeService = {
  getStructures: async (params?: {
    academic_year_id?: string;
    class_id?: string;
  }) => {
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
  }) => {
    const q = new URLSearchParams();
    if (params?.student_id) q.set("student_id", params.student_id);
    if (params?.fee_structure_id) q.set("fee_structure_id", params.fee_structure_id);
    if (params?.status) q.set("status", params.status);
    if (params?.academic_year_id) q.set("academic_year_id", params.academic_year_id);
    const url = `/api/finance/student-fees${q.toString() ? `?${q}` : ""}`;
    const res = await apiGet<{ student_fees: StudentFee[] }>(url);
    return res?.student_fees ?? [];
  },

  getSummary: async () =>
    apiGet<{
      total_expected: number;
      total_collected: number;
      total_outstanding: number;
      overdue_count: number;
    }>("/api/finance/summary"),

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

  updateStructure: async (
    id: string,
    data: Partial<CreateStructureInput>
  ) => {
    const res = await apiPut<{ fee_structure?: FeeStructure }>(
      `/api/finance/structures/${id}`,
      data
    );
    return (res as { fee_structure?: FeeStructure })?.fee_structure ?? res;
  },

  deleteStructure: async (id: string) => {
    await apiDelete(`/api/finance/structures/${id}`);
  },

  getStudentFee: async (id: string) => apiGet<StudentFee>(`/api/finance/student-fees/${id}`),

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

  /** Download invoice PDF for a student fee. Returns blob for save/print. */
  downloadInvoicePdf: async (studentFeeId: string): Promise<Blob> =>
    apiGetBlob(`/api/finance/student-fees/${studentFeeId}/download-invoice`),

  /** Download receipt PDF for a payment. Returns blob for save/print. */
  downloadReceiptPdf: async (paymentId: string): Promise<Blob> =>
    apiGetBlob(`/api/finance/payments/${paymentId}/download-receipt`),

  /** Open dual-copy print page for an invoice (office copy + student copy, no auto-note). */
  printInvoice: async (studentFeeId: string): Promise<void> => {
    const html = await apiGetText(`/api/finance/student-fees/${studentFeeId}/print-invoice`);
    const blob = new Blob([html], { type: "text/html" });
    const blobUrl = URL.createObjectURL(blob);
    const w = window.open(blobUrl, "_blank");
    if (w) {
      w.onload = () => { w.print(); setTimeout(() => URL.revokeObjectURL(blobUrl), 2000); };
    } else {
      window.open(blobUrl);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
    }
  },

  /** Open dual-copy print page for a receipt (office copy + student copy, no auto-note). */
  printReceipt: async (paymentId: string): Promise<void> => {
    const html = await apiGetText(`/api/finance/payments/${paymentId}/print-receipt`);
    const blob = new Blob([html], { type: "text/html" });
    const blobUrl = URL.createObjectURL(blob);
    const w = window.open(blobUrl, "_blank");
    if (w) {
      w.onload = () => { w.print(); setTimeout(() => URL.revokeObjectURL(blobUrl), 2000); };
    } else {
      window.open(blobUrl);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
    }
  },
};
