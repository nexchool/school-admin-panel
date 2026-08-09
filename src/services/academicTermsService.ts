import { gql } from "@/services/graphql";
import { apiDelete, apiPatch, apiPost } from "@/services/api";

export interface AcademicTerm {
  id: string;
  academic_year_id: string;
  name: string;
  code: string | null;
  sequence: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

const TERMS = `
  query AcademicTerms($yearId: ID) {
    academicTerms(academicYearId: $yearId) {
      id name code sequence startDate endDate isActive academicYearId
    }
  }
`;

export const academicTermsService = {
  list: async (academicYearId?: string): Promise<AcademicTerm[]> => {
    const data = await gql<{
      academicTerms: {
        id: string;
        name: string;
        code: string | null;
        sequence: number;
        startDate: string | null;
        endDate: string | null;
        isActive: boolean;
        academicYearId: string | null;
      }[];
    }>(TERMS, { yearId: academicYearId ?? null });
    return data.academicTerms.map(
      (term) =>
        ({
          id: term.id,
          name: term.name,
          code: term.code,
          sequence: term.sequence,
          start_date: term.startDate,
          end_date: term.endDate,
          is_active: term.isActive,
          academic_year_id: term.academicYearId,
        }) as unknown as AcademicTerm,
    );
  },
  create: (data: Partial<AcademicTerm>) =>
    apiPost<AcademicTerm>("/api/academics/terms", data),
  update: (id: string, data: Partial<AcademicTerm>) =>
    apiPatch<AcademicTerm>(`/api/academics/terms/${id}`, data),
  remove: (id: string) => apiDelete<void>(`/api/academics/terms/${id}`),
};
