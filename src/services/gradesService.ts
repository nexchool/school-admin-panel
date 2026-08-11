import { academicStructureService } from "@/services/academicStructureService";

export interface Grade {
  id: string;
  name: string;
  sequence: number;
}

/**
 * The year-groups a school teaches.
 *
 * Reads and writes both live in `academicStructureService`, which owns the
 * GraphQL shape of a grade; this stays as the name the hooks already import.
 */
export const gradesService = {
  create: (data: Partial<Grade>) => academicStructureService.addGrade(data),
  update: (id: string, data: Partial<Grade>) =>
    academicStructureService.updateGrade(id, data),
  remove: (id: string) => academicStructureService.removeGrade(id),
};
