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
import type { AcademicProgramme } from "./programmesService";
import type { Grade } from "./gradesService";
import type { MediumDto } from "./mediumsService";

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

const PROGRAMMES = `
  query Programmes($status: String) {
    programmes(status: $status) { id name board code status medium mediumId }
  }
`;

const GRADES = `query Grades { grades { id name sequence } }`;

const MEDIUMS = `
  query Mediums($includeInactive: Boolean) {
    mediums(includeInactive: $includeInactive) { id name code isActive }
  }
`;

type ProgrammeNode = {
  id: string;
  name: string;
  board: string;
  code: string;
  status: string;
  medium: string | null;
  mediumId: string | null;
};

type MediumNode = {
  id: string;
  name: string;
  code: string | null;
  isActive: boolean;
};

// Every one of these gets an explicit mapper rather than a type assertion.
// Asserting the client's shape onto a GraphQL result is what let camelCase
// dates through as undefined and rendered "Invalid Date" on every row.
function toProgramme(node: ProgrammeNode): AcademicProgramme {
  return {
    id: node.id,
    name: node.name,
    board: node.board,
    medium: node.medium,
    medium_id: node.mediumId,
    code: node.code,
    status: node.status,
  } as AcademicProgramme;
}

function toMedium(node: MediumNode, tenantId = ""): MediumDto {
  return {
    id: node.id,
    tenant_id: tenantId,
    name: node.name,
    code: node.code,
    is_active: node.isActive,
    created_at: null,
    updated_at: null,
  };
}

export const academicStructureService = {
  campuses: async (status?: string): Promise<SchoolUnit[]> => {
    const data = await gql<{ campuses: CampusNode[] }>(CAMPUSES, { status });
    return data.campuses.map(toSchoolUnit);
  },

  programmes: async (status?: string): Promise<AcademicProgramme[]> => {
    const data = await gql<{ programmes: ProgrammeNode[] }>(PROGRAMMES, {
      status,
    });
    return data.programmes.map(toProgramme);
  },

  grades: async (): Promise<Grade[]> => {
    const data = await gql<{ grades: Grade[] }>(GRADES);
    // Grade is { id, name, sequence } on both sides — no names differ, so
    // there is nothing to map and nothing to get wrong.
    return data.grades;
  },

  mediums: async (includeInactive = false): Promise<MediumDto[]> => {
    const data = await gql<{ mediums: MediumNode[] }>(MEDIUMS, {
      includeInactive,
    });
    return data.mediums.map((node) => toMedium(node));
  },

  academicYears: async (activeOnly = false): Promise<AcademicYear[]> => {
    const data = await gql<{ academicYears: AcademicYearNode[] }>(
      ACADEMIC_YEARS,
      { activeOnly },
    );
    return data.academicYears.map(toAcademicYear);
  },
};
