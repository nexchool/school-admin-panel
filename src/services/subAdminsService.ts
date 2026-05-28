import { apiGet, apiPost, apiPut, apiDelete } from "@/services/api";

/**
 * Sub-Admins service (tenant-scoped). Mirrors the backend contract in
 * `server/modules/sub_admins/`. All endpoints are gated on `subadmin.manage`.
 *
 * Backend payload note: module selections use snake-case-ish flat keys
 * `{ key, level, delete?, refund?, manage? }` exactly as `expand_selection`
 * in `catalog.py` consumes them.
 */

// ---------------------------------------------------------------------------
// Types — match serialize_sub_admin / catalog.py exactly
// ---------------------------------------------------------------------------

/** Minimum length enforced on sub-admin passwords (create + reset). */
export const PASSWORD_MIN_LENGTH = 8;

export type SubAdminStatus = "active" | "suspended";

export type ModuleLevel = "none" | "view" | "edit" | "operate" | "manage";

export type ModuleToggle = "delete" | "refund";

/** One row in the granted-modules summary (from summarize_permissions). */
export interface SubAdminModuleSummary {
  key: string;
  label: string;
  level: ModuleLevel;
  delete: boolean;
  refund: boolean;
  manage: boolean;
}

/** A sub-admin as returned by the list / detail / create / update endpoints. */
export interface SubAdmin {
  id: string;
  name: string;
  email: string;
  status: SubAdminStatus;
  modules: SubAdminModuleSummary[];
  /** Present only on detail / create / update responses. */
  created_at?: string | null;
  updated_at?: string | null;
}

/** Catalog entry from GET /api/sub-admins/modules. */
export interface SubAdminModuleCatalogEntry {
  key: string;
  label: string;
  /** Ordered level keys offered by the module (excludes "none"). */
  levels: ModuleLevel[];
  /** Toggle keys the module supports (e.g. "delete", "refund", "manage"). */
  toggles: string[];
}

/** A single module grant sent to create/update. */
export interface SubAdminModuleSelection {
  key: string;
  level: ModuleLevel;
  delete?: boolean;
  refund?: boolean;
  manage?: boolean;
}

export interface SubAdminsListParams {
  search?: string;
  status?: SubAdminStatus | "";
  page?: number;
  per_page?: number;
}

export interface SubAdminsPagination {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
  has_prev: boolean;
  has_next: boolean;
}

export interface SubAdminsListResult {
  items: SubAdmin[];
  pagination: SubAdminsPagination;
}

export interface CreateSubAdminPayload {
  name: string;
  email: string;
  password: string;
  modules: SubAdminModuleSelection[];
}

export interface UpdateSubAdminPayload {
  name?: string;
  modules?: SubAdminModuleSelection[];
}

// Raw list envelope shape the backend route returns.
interface RawListResponse {
  sub_admins?: SubAdmin[];
  pagination?: Partial<SubAdminsPagination>;
}

interface RawModulesResponse {
  modules?: SubAdminModuleCatalogEntry[];
}

const BASE = "/api/sub-admins";

export const subAdminsService = {
  list: async (params?: SubAdminsListParams): Promise<SubAdminsListResult> => {
    let url = BASE;
    if (params) {
      const qp = new URLSearchParams();
      if (params.search) qp.set("search", params.search);
      if (params.status) qp.set("status", params.status);
      if (params.page !== undefined) qp.set("page", String(params.page));
      if (params.per_page !== undefined)
        qp.set("per_page", String(params.per_page));
      const qs = qp.toString();
      if (qs) url += `?${qs}`;
    }
    const data = await apiGet<RawListResponse>(url);
    return {
      items: data?.sub_admins ?? [],
      pagination: {
        page: data?.pagination?.page ?? 1,
        per_page: data?.pagination?.per_page ?? 20,
        total: data?.pagination?.total ?? 0,
        total_pages: data?.pagination?.total_pages ?? 1,
        has_prev: data?.pagination?.has_prev ?? false,
        has_next: data?.pagination?.has_next ?? false,
      },
    };
  },

  getModules: async (): Promise<SubAdminModuleCatalogEntry[]> => {
    const data = await apiGet<RawModulesResponse>(`${BASE}/modules`);
    return data?.modules ?? [];
  },

  create: async (payload: CreateSubAdminPayload): Promise<SubAdmin> => {
    return apiPost<SubAdmin>(BASE, payload);
  },

  get: async (id: string): Promise<SubAdmin> => {
    return apiGet<SubAdmin>(`${BASE}/${id}`);
  },

  update: async (
    id: string,
    payload: UpdateSubAdminPayload
  ): Promise<SubAdmin> => {
    return apiPut<SubAdmin>(`${BASE}/${id}`, payload);
  },

  suspend: async (id: string): Promise<void> => {
    await apiPost(`${BASE}/${id}/suspend`);
  },

  restore: async (id: string): Promise<void> => {
    await apiPost(`${BASE}/${id}/restore`);
  },

  resetPassword: async (id: string, password: string): Promise<void> => {
    await apiPost(`${BASE}/${id}/reset-password`, { password });
  },

  remove: async (id: string): Promise<void> => {
    await apiDelete(`${BASE}/${id}`);
  },
};
