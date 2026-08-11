import { beforeEach, describe, expect, it, vi } from "vitest";

import { studentsService } from "./studentsService";

const gql = vi.fn();
vi.mock("./graphql", () => ({ gql: (...args: unknown[]) => gql(...args) }));

const NODE = {
  id: "s-1",
  admissionNumber: "ADM-0001",
  fullName: "Aarav Shah",
  status: "active",
  rollNumber: 1,
  gender: "male",
  guardianPhone: "9884000344",
  academicYearId: "ay-1",
  currentClass: { id: "c-1", displayName: "Grade 5-A", programmeName: "CBSE" },
};

function reply(nodes: unknown[], totalCount = nodes.length) {
  gql.mockResolvedValue({
    students: { totalCount, edges: nodes.map((node) => ({ node })) },
  });
}

function variables() {
  return gql.mock.calls[0][1] as Record<string, unknown>;
}

describe("studentsService.getStudents", () => {
  beforeEach(() => gql.mockReset());

  // The screen speaks the REST payload's shape. Mapping here is what let the
  // transport swap without touching the table, the pickers or the wizard.
  it("gives callers the shape they already read", async () => {
    reply([NODE]);

    const { items } = await studentsService.getStudents();

    expect(items[0]).toMatchObject({
      id: "s-1",
      name: "Aarav Shah",
      admission_number: "ADM-0001",
      student_status: "active",
      roll_number: 1,
      gender: "male",
      guardian_phone: "9884000344",
      academic_year_id: "ay-1",
      class_id: "c-1",
      class_name: "Grade 5-A",
      programme_name: "CBSE",
    });
  });

  it("leaves a student with no class readable", async () => {
    reply([{ ...NODE, currentClass: null, rollNumber: null }]);

    const { items } = await studentsService.getStudents();

    expect(items[0].class_name).toBeUndefined();
    expect(items[0].roll_number).toBeUndefined();
  });

  it("turns a page number into the offset the server pages by", async () => {
    reply([]);

    await studentsService.getStudents({ page: 4, per_page: 20 });

    expect(variables()).toMatchObject({ first: 20, offset: 60 });
  });

  it("reports how many pages the total makes", async () => {
    reply([NODE], 142);

    const result = await studentsService.getStudents({ page: 1, per_page: 20 });

    expect(result.total).toBe(142);
    expect(result.total_pages).toBe(8);
  });

  // Pickers used to call this with no arguments, which asked the server for
  // every student in the school. On a fifteen-thousand-student trust that is
  // one request away from an outage.
  it("never asks for the whole school", async () => {
    reply([]);

    await studentsService.getStudents();

    expect(variables().first).toBe(100);
  });

  it("caps a page size a caller asks to exceed", async () => {
    reply([]);

    await studentsService.getStudents({ page: 1, per_page: 5000 });

    expect(variables().first).toBe(100);
  });

  it("passes the sort the table asked for", async () => {
    reply([]);

    await studentsService.getStudents({ sort_by: "roll_number", sort_dir: "desc" });

    expect(variables()).toMatchObject({
      orderBy: "ROLL_NUMBER",
      direction: "DESC",
    });
  });

  it("sends the filters as one input rather than a query string", async () => {
    reply([]);

    await studentsService.getStudents({
      search: "Shah",
      search_field: "name",
      programme_id: "prog-1",
      gender: "female",
      is_transport_opted: true,
      admission_date_from: "2026-06-01",
      student_status: "active",
    });

    expect(variables().where).toMatchObject({
      search: "Shah",
      searchField: "name",
      programmeId: "prog-1",
      gender: "female",
      isTransportOpted: true,
      admittedFrom: "2026-06-01",
      status: "active",
    });
  });

  it("asks for several classes when several are selected, not one", async () => {
    reply([]);

    await studentsService.getStudents({
      class_id: "c-1",
      class_ids: ["c-2", "c-3"],
    });

    const where = variables().where as Record<string, unknown>;
    expect(where.classIds).toEqual(["c-2", "c-3"]);
    expect(where.classId).toBeUndefined();
  });
});
