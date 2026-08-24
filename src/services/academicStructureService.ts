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
import type { Subject } from "@/types/subject";

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

const SUBJECTS = `
  query Subjects($includeInactive: Boolean) {
    subjects(includeInactive: $includeInactive) {
      id name code description subjectType isActive
    }
  }
`;

type SubjectNode = {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  subjectType: string | null;
  isActive: boolean;
};

function toSubject(node: SubjectNode): Subject {
  return {
    id: node.id,
    name: node.name,
    code: node.code ?? undefined,
    description: node.description ?? undefined,
    subject_type: node.subjectType ?? undefined,
    is_active: node.isActive,
  };
}

// ---------------------------------------------------------------------------
// Changing the structure
// ---------------------------------------------------------------------------
//
// The write half of the four reads above, kept in the same file because they
// share the mappers: a campus that comes back from `addCampus` is the same
// shape `campuses` returns, and having one place that knows that shape is the
// whole reason the reads stopped using type assertions.
//
// Two things differ from the REST calls these replace. GraphQL names fields in
// camelCase while the client DTOs are snake_case, so each write needs a mapper
// in the other direction — `toCampusInput` and friends below. And a partial
// update sends only the keys the caller set: the server treats an absent field
// as "leave it alone", so passing `undefined` through is meaningful rather than
// sloppy, and `dropUnset` is what makes it deliberate.

function dropUnset<T extends Record<string, unknown>>(input: T): T {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined),
  ) as T;
}

function toCampusInput(data: Partial<SchoolUnit>) {
  return dropUnset({
    name: data.name,
    code: data.code,
    status: data.status,
    address: data.address,
    phone: data.phone,
    diseNo: data.dise_no,
    indexNo: data.index_no,
    recognitionNo: data.recognition_no,
    grNumberScheme: data.gr_number_scheme,
    logoUrl: data.logo_url,
    principalSignatureUrl: data.principal_signature_url,
  });
}

function toProgrammeInput(data: Partial<AcademicProgramme>) {
  return dropUnset({
    name: data.name,
    board: data.board,
    code: data.code,
    medium: data.medium,
    mediumId: data.medium_id,
    status: data.status,
  });
}

function toMediumInput(data: Partial<MediumDto>) {
  return dropUnset({
    name: data.name,
    code: data.code,
    isActive: data.is_active,
  });
}

const CAMPUS_FIELDS = `
  id name code status phone address
  diseNo indexNo recognitionNo grNumberScheme
  logoUrl principalSignatureUrl
`;
const PROGRAMME_FIELDS = `id name board code status medium mediumId`;

const ADD_CAMPUS = `
  mutation AddCampus($input: CampusInput!) {
    addCampus(input: $input) { ${CAMPUS_FIELDS} }
  }
`;
const UPDATE_CAMPUS = `
  mutation UpdateCampus($id: ID!, $changes: CampusChanges!) {
    updateCampus(id: $id, changes: $changes) { ${CAMPUS_FIELDS} }
  }
`;
const REMOVE_CAMPUS = `mutation RemoveCampus($id: ID!) { removeCampus(id: $id) }`;

const ADD_PROGRAMME = `
  mutation AddProgramme($input: ProgrammeInput!) {
    addProgramme(input: $input) { ${PROGRAMME_FIELDS} }
  }
`;
const UPDATE_PROGRAMME = `
  mutation UpdateProgramme($id: ID!, $changes: ProgrammeChanges!) {
    updateProgramme(id: $id, changes: $changes) { ${PROGRAMME_FIELDS} }
  }
`;
const REMOVE_PROGRAMME = `mutation RemoveProgramme($id: ID!) { removeProgramme(id: $id) }`;

const ADD_GRADE = `
  mutation AddGrade($input: GradeInput!) {
    addGrade(input: $input) { id name sequence }
  }
`;
const UPDATE_GRADE = `
  mutation UpdateGrade($id: ID!, $changes: GradeChanges!) {
    updateGrade(id: $id, changes: $changes) { id name sequence }
  }
`;
const REMOVE_GRADE = `mutation RemoveGrade($id: ID!) { removeGrade(id: $id) }`;

const ADD_MEDIUM = `
  mutation AddMedium($input: MediumInput!) {
    addMedium(input: $input) { id name code isActive }
  }
`;
const UPDATE_MEDIUM = `
  mutation UpdateMedium($id: ID!, $changes: MediumChanges!) {
    updateMedium(id: $id, changes: $changes) { id name code isActive }
  }
`;
const REMOVE_MEDIUM = `mutation RemoveMedium($id: ID!) { removeMedium(id: $id) }`;


// --- Academic cycles --------------------------------------------------------
// The dated period a year is actually operated in. A school has one until it
// runs two boards on different calendars, or opens a vacation batch — which is
// why every screen defaults it rather than asking.
const ACADEMIC_CYCLES = `
  query AcademicCycles($academicYearId: ID!) {
    academicCycles(academicYearId: $academicYearId) {
      id academicYearId name startDate endDate cycleKind
    }
  }
`;
const ADD_ACADEMIC_CYCLE = `
  mutation AddAcademicCycle($input: AcademicCycleInput!) {
    addAcademicCycle(input: $input) {
      id academicYearId name startDate endDate cycleKind
    }
  }
`;
const UPDATE_ACADEMIC_CYCLE = `
  mutation UpdateAcademicCycle($id: ID!, $changes: AcademicCycleChanges!) {
    updateAcademicCycle(id: $id, changes: $changes) {
      id academicYearId name startDate endDate cycleKind
    }
  }
`;
const ARCHIVE_ACADEMIC_CYCLE = `
  mutation ArchiveAcademicCycle($id: ID!) {
    archiveAcademicCycle(id: $id) { id name }
  }
`;

export type AcademicCycle = {
  id: string;
  academicYearId: string;
  name: string;
  startDate: string;
  endDate: string;
  cycleKind: string;
};

export type AcademicCycleInput = {
  academicYearId: string;
  name: string;
  startDate: string;
  endDate: string;
  cycleKind?: string;
};

export type AcademicCycleChanges = Partial<
  Omit<AcademicCycleInput, "academicYearId">
>;

export const academicStructureService = {
  academicCycles: async (academicYearId: string): Promise<AcademicCycle[]> => {
    const data = await gql<{ academicCycles: AcademicCycle[] }>(
      ACADEMIC_CYCLES,
      { academicYearId },
    );
    // Field names match on both sides, so there is nothing to map and
    // nothing to get wrong.
    return data.academicCycles;
  },

  addAcademicCycle: async (input: AcademicCycleInput): Promise<AcademicCycle> => {
    const data = await gql<{ addAcademicCycle: AcademicCycle }>(
      ADD_ACADEMIC_CYCLE,
      { input },
    );
    return data.addAcademicCycle;
  },

  updateAcademicCycle: async (
    id: string,
    changes: AcademicCycleChanges,
  ): Promise<AcademicCycle> => {
    const data = await gql<{ updateAcademicCycle: AcademicCycle }>(
      UPDATE_ACADEMIC_CYCLE,
      { id, changes },
    );
    return data.updateAcademicCycle;
  },

  archiveAcademicCycle: async (id: string): Promise<{ id: string }> => {
    const data = await gql<{ archiveAcademicCycle: { id: string } }>(
      ARCHIVE_ACADEMIC_CYCLE,
      { id },
    );
    return data.archiveAcademicCycle;
  },

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

  subjects: async (includeInactive = false): Promise<Subject[]> => {
    const data = await gql<{ subjects: SubjectNode[] }>(SUBJECTS, {
      includeInactive,
    });
    return data.subjects.map(toSubject);
  },

  academicYears: async (activeOnly = false): Promise<AcademicYear[]> => {
    const data = await gql<{ academicYears: AcademicYearNode[] }>(
      ACADEMIC_YEARS,
      { activeOnly },
    );
    return data.academicYears.map(toAcademicYear);
  },

  // -- writes ---------------------------------------------------------------

  addCampus: async (data: Partial<SchoolUnit>): Promise<SchoolUnit> => {
    const result = await gql<{ addCampus: CampusNode }>(ADD_CAMPUS, {
      // The schema requires a name and a code, and omitting one would produce a
      // raw schema error rather than the server's own "name is required".
      // Sending the empty string lets the service answer, so a missing field
      // reads the same as it did over REST.
      input: { ...toCampusInput(data), name: data.name ?? "", code: data.code ?? "" },
    });
    return toSchoolUnit(result.addCampus);
  },

  updateCampus: async (
    id: string,
    data: Partial<SchoolUnit>,
  ): Promise<SchoolUnit> => {
    const result = await gql<{ updateCampus: CampusNode }>(UPDATE_CAMPUS, {
      id,
      changes: toCampusInput(data),
    });
    return toSchoolUnit(result.updateCampus);
  },

  removeCampus: async (id: string): Promise<void> => {
    await gql<{ removeCampus: boolean }>(REMOVE_CAMPUS, { id });
  },

  addProgramme: async (
    data: Partial<AcademicProgramme>,
  ): Promise<AcademicProgramme> => {
    const result = await gql<{ addProgramme: ProgrammeNode }>(ADD_PROGRAMME, {
      input: {
        ...toProgrammeInput(data),
        name: data.name ?? "",
        board: data.board ?? "",
        code: data.code ?? "",
      },
    });
    return toProgramme(result.addProgramme);
  },

  updateProgramme: async (
    id: string,
    data: Partial<AcademicProgramme>,
  ): Promise<AcademicProgramme> => {
    const result = await gql<{ updateProgramme: ProgrammeNode }>(
      UPDATE_PROGRAMME,
      { id, changes: toProgrammeInput(data) },
    );
    return toProgramme(result.updateProgramme);
  },

  removeProgramme: async (id: string): Promise<void> => {
    await gql<{ removeProgramme: boolean }>(REMOVE_PROGRAMME, { id });
  },

  addGrade: async (data: Partial<Grade>): Promise<Grade> => {
    const result = await gql<{ addGrade: Grade }>(ADD_GRADE, {
      input: dropUnset({ name: data.name ?? "", sequence: data.sequence }),
    });
    return result.addGrade;
  },

  updateGrade: async (id: string, data: Partial<Grade>): Promise<Grade> => {
    const result = await gql<{ updateGrade: Grade }>(UPDATE_GRADE, {
      id,
      changes: dropUnset({ name: data.name, sequence: data.sequence }),
    });
    return result.updateGrade;
  },

  removeGrade: async (id: string): Promise<void> => {
    await gql<{ removeGrade: boolean }>(REMOVE_GRADE, { id });
  },

  addMedium: async (data: Partial<MediumDto>): Promise<MediumDto> => {
    const result = await gql<{ addMedium: MediumNode }>(ADD_MEDIUM, {
      input: { ...toMediumInput(data), name: data.name ?? "" },
    });
    return toMedium(result.addMedium);
  },

  updateMedium: async (
    id: string,
    data: Partial<MediumDto>,
  ): Promise<MediumDto> => {
    const result = await gql<{ updateMedium: MediumNode }>(UPDATE_MEDIUM, {
      id,
      changes: toMediumInput(data),
    });
    return toMedium(result.updateMedium);
  },

  removeMedium: async (id: string): Promise<void> => {
    await gql<{ removeMedium: boolean }>(REMOVE_MEDIUM, { id });
  },
};
