import { apiDelete, apiGet, apiPatch, apiPost } from "@/services/api";

export type SchoolUnitType =
  | "nursery"
  | "primary"
  | "secondary"
  | "higher_secondary"
  | "other";

export type ActiveStatus = "active" | "inactive";

export interface SchoolUnit {
  id: string;
  name: string;
  code: string;
  type: SchoolUnitType;
  dise_no: string | null;
  index_no: string | null;
  recognition_no: string | null;
  phone: string | null;
  address: string | null;
  logo_url: string | null;
  principal_signature_url: string | null;
  status: ActiveStatus;
  created_at: string | null;
  updated_at: string | null;
}

export const schoolUnitsService = {
  list: () => apiGet<SchoolUnit[]>("/api/school-units/"),
  create: (data: Partial<SchoolUnit>) =>
    apiPost<SchoolUnit>("/api/school-units/", data),
  update: (id: string, data: Partial<SchoolUnit>) =>
    apiPatch<SchoolUnit>(`/api/school-units/${id}`, data),
  remove: (id: string) => apiDelete<void>(`/api/school-units/${id}`),
};
