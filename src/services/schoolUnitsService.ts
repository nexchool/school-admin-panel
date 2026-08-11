import { academicStructureService } from "@/services/academicStructureService";

export type ActiveStatus = "active" | "inactive";

export interface SchoolUnit {
  id: string;
  name: string;
  code: string;
  type: "campus";
  dise_no: string | null;
  index_no: string | null;
  recognition_no: string | null;
  gr_number_scheme: string | null;
  phone: string | null;
  address: string | null;
  logo_url: string | null;
  principal_signature_url: string | null;
  status: ActiveStatus;
  created_at: string | null;
  updated_at: string | null;
}

/**
 * The sites a school teaches at — a campus, in the words the v2 canon uses.
 *
 * Reads and writes both live in `academicStructureService`; this stays as the
 * name the hooks already import.
 */
export const schoolUnitsService = {
  create: (data: Partial<SchoolUnit>) =>
    academicStructureService.addCampus(data),
  update: (id: string, data: Partial<SchoolUnit>) =>
    academicStructureService.updateCampus(id, data),
  remove: (id: string) => academicStructureService.removeCampus(id),
};
