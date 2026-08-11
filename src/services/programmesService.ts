import { academicStructureService } from "@/services/academicStructureService";
import type { ActiveStatus } from "@/services/schoolUnitsService";

export interface AcademicProgramme {
  id: string;
  name: string;
  board: string;
  medium: string | null;
  medium_id?: string | null;
  code: string;
  status: ActiveStatus;
}

/**
 * The courses of education a school offers.
 *
 * Reads and writes both live in `academicStructureService`; this stays as the
 * name the hooks already import.
 */
export const programmesService = {
  create: (data: Partial<AcademicProgramme>) =>
    academicStructureService.addProgramme(data),
  update: (id: string, data: Partial<AcademicProgramme>) =>
    academicStructureService.updateProgramme(id, data),
  remove: (id: string) => academicStructureService.removeProgramme(id),
};
