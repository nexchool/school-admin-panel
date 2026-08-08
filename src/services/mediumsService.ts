import { apiDelete, apiPatch, apiPost } from "@/services/api";

export interface MediumDto {
  id: string;
  tenant_id: string;
  name: string;
  code: string | null;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface CreateMediumInput {
  name: string;
  code?: string;
  is_active?: boolean;
}

export const mediumsService = {
  create: (input: CreateMediumInput): Promise<MediumDto> =>
    apiPost<MediumDto>("/api/mediums/", input),

  patch: (
    id: string,
    input: Partial<CreateMediumInput>,
  ): Promise<MediumDto> => apiPatch<MediumDto>(`/api/mediums/${id}`, input),

  remove: (id: string): Promise<void> =>
    apiDelete<void>(`/api/mediums/${id}`),
};
