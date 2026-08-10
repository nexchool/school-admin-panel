import { academicStructureService } from "@/services/academicStructureService";

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

/**
 * The languages a school teaches in.
 *
 * Reads and writes both live in `academicStructureService`; this stays as the
 * name the hooks already import.
 */
export const mediumsService = {
  create: (input: CreateMediumInput): Promise<MediumDto> =>
    academicStructureService.addMedium(input),

  patch: (id: string, input: Partial<CreateMediumInput>): Promise<MediumDto> =>
    academicStructureService.updateMedium(id, input),

  remove: (id: string): Promise<void> =>
    academicStructureService.removeMedium(id),
};
