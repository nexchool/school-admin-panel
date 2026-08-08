/**
 * The structure a school is arranged into.
 *
 * Campuses and academic years are what nearly every other read hangs off, and
 * they are the first Academics reads on GraphQL. They stay two calls rather
 * than one bundled "scope" query on purpose: they answer to different
 * permissions, so a person holding one and not the other still gets what they
 * may see. A screen wanting both can still ask for both in one request.
 *
 * `Campus` is the word the v2 canon uses for what the tables call a school
 * unit; the client type keeps the old name until the screens are renamed.
 */

import { gql } from "./graphql";
import type { SchoolUnit } from "./schoolUnitsService";
import type { AcademicYear } from "./academicYearsService";

const CAMPUSES = `
  query Campuses($status: String) {
    campuses(status: $status) {
      id name code status phone address
      diseNo indexNo recognitionNo grNumberScheme
      logoUrl principalSignatureUrl
    }
  }
`;

const ACADEMIC_YEARS = `
  query AcademicYears($activeOnly: Boolean) {
    academicYears(activeOnly: $activeOnly) {
      id name startDate endDate isActive
    }
  }
`;

type CampusNode = {
  id: string;
  name: string;
  code: string;
  status: string;
  phone: string | null;
  address: string | null;
  diseNo: string | null;
  indexNo: string | null;
  recognitionNo: string | null;
  grNumberScheme: string | null;
  logoUrl: string | null;
  principalSignatureUrl: string | null;
};

/** GraphQL says campus; the screens still say school unit. */
function toSchoolUnit(node: CampusNode): SchoolUnit {
  return {
    id: node.id,
    name: node.name,
    code: node.code,
    type: "campus",
    dise_no: node.diseNo,
    index_no: node.indexNo,
    recognition_no: node.recognitionNo,
    gr_number_scheme: node.grNumberScheme,
    phone: node.phone,
    address: node.address,
    logo_url: node.logoUrl,
    principal_signature_url: node.principalSignatureUrl,
    status: node.status,
    created_at: null,
    updated_at: null,
  } as SchoolUnit;
}

type AcademicYearNode = {
  id: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
};

/** Same swap as the campus above: GraphQL names things its own way. */
function toAcademicYear(node: AcademicYearNode): AcademicYear {
  return {
    id: node.id,
    name: node.name,
    start_date: node.startDate ?? "",
    end_date: node.endDate ?? "",
    is_active: node.isActive,
  };
}

export const academicStructureService = {
  campuses: async (status?: string): Promise<SchoolUnit[]> => {
    const data = await gql<{ campuses: CampusNode[] }>(CAMPUSES, { status });
    return data.campuses.map(toSchoolUnit);
  },

  academicYears: async (activeOnly = false): Promise<AcademicYear[]> => {
    const data = await gql<{ academicYears: AcademicYearNode[] }>(
      ACADEMIC_YEARS,
      { activeOnly },
    );
    return data.academicYears.map(toAcademicYear);
  },
};
