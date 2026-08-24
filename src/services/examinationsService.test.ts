/**
 * The GraphQL contract, asserted at the wire rather than through a component.
 *
 * What matters here is that the operation and its variables are exactly what
 * the server's schema accepts — a renamed field would otherwise only fail in
 * a running environment.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import { examinationsService } from "./examinationsService";
import { gql } from "./graphql";

vi.mock("./graphql", () => ({ gql: vi.fn() }));

beforeEach(() => vi.clearAllMocks());

describe("examinationsService", () => {
  it("asks for a page with the API's offset model", async () => {
    vi.mocked(gql).mockResolvedValue({
      examinations: { nodes: [], hasNextPage: false, totalCount: 0 },
    });

    await examinationsService.list({
      academicCycleId: "cy-1",
      status: "scheduled",
      limit: 20,
      offset: 40,
    });

    const [query, variables] = vi.mocked(gql).mock.calls[0];
    expect(query).toContain("query Examinations");
    expect(variables).toEqual({
      academicCycleId: "cy-1",
      status: "scheduled",
      limit: 20,
      offset: 40,
    });
  });

  it("sends null rather than undefined for an unset filter", async () => {
    vi.mocked(gql).mockResolvedValue({
      examinations: { nodes: [], hasNextPage: false, totalCount: 0 },
    });
    await examinationsService.list({ limit: 20, offset: 0 });

    const [, variables] = vi.mocked(gql).mock.calls[0];
    expect(variables).toMatchObject({ academicCycleId: null, status: null });
  });

  it("creates an examination and its papers in one operation", async () => {
    vi.mocked(gql).mockResolvedValue({ createExamination: { id: "ex-1" } });

    await examinationsService.create({
      academicCycleId: "cy-1",
      examTypeId: "et-1",
      name: "Half Yearly",
      subjectSet: {
        classIds: ["cl-a", "cl-b"],
        subjects: [{ subjectId: "sb-1", maxMarks: 100, passMarks: 35 }],
      },
    });

    const [query, variables] = vi.mocked(gql).mock.calls[0];
    expect(query).toContain("mutation CreateExamination");
    expect(query).toContain("$input: CreateExaminationInput!");
    expect(
      (variables as { input: { subjectSet: { classIds: string[] } } }).input
        .subjectSet.classIds,
    ).toEqual(["cl-a", "cl-b"]);
  });

  it("cancels with a reason, which the server requires", async () => {
    vi.mocked(gql).mockResolvedValue({ cancelExamination: { id: "ex-1" } });
    await examinationsService.cancel("ex-1", "Flooding");

    const [query, variables] = vi.mocked(gql).mock.calls[0];
    expect(query).toContain("mutation CancelExamination");
    expect(variables).toEqual({ id: "ex-1", reason: "Flooding" });
  });

  it("schedules by id alone", async () => {
    vi.mocked(gql).mockResolvedValue({ scheduleExamination: { id: "ex-1" } });
    await examinationsService.schedule("ex-1");

    const [query, variables] = vi.mocked(gql).mock.calls[0];
    expect(query).toContain("mutation ScheduleExamination");
    expect(variables).toEqual({ id: "ex-1" });
  });

  it("asks the detail query for papers, sections and history", async () => {
    vi.mocked(gql).mockResolvedValue({ examination: null });
    await examinationsService.get("ex-1");

    const [query] = vi.mocked(gql).mock.calls[0];
    expect(query).toContain("papers");
    expect(query).toContain("classesSitting");
    expect(query).toContain("timeline");
  });

  it("adds papers as a subject set, never as individual papers", async () => {
    vi.mocked(gql).mockResolvedValue({ addExamPapers: { id: "ex-1" } });
    await examinationsService.addPapers("ex-1", {
      classIds: ["cl-a"],
      subjects: [{ subjectId: "sb-1", maxMarks: 50 }],
    });

    const [query, variables] = vi.mocked(gql).mock.calls[0];
    expect(query).toContain("$subjectSet: SubjectSetInput!");
    expect(variables).toEqual({
      examinationId: "ex-1",
      subjectSet: { classIds: ["cl-a"], subjects: [{ subjectId: "sb-1", maxMarks: 50 }] },
    });
  });
});
