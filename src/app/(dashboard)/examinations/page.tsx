"use client";

/**
 * Examinations a school holds.
 *
 * The list is offset-paged because the API is: an examination has no key that
 * is unique, immutable and meaningful to a school, so there is no cursor to
 * walk. That is affordable because the thing is bounded — a cycle holds a
 * handful of examinations, not fifteen thousand children.
 */

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable, type DataTableColumn } from "@/components/tables/DataTable";
import { CreateExaminationWizard } from "@/components/examinations/CreateExaminationWizard";
import { useAuth } from "@/hooks";
import { useExaminations } from "@/hooks/useExaminations";
import { useAcademicCycles } from "@/hooks/useAcademicCycles";
import { useActiveAcademicYear } from "@/contexts/ActiveAcademicYearContext";
import { useClassesList } from "@/hooks/useClasses";
import { useSubjects } from "@/hooks/useSubjects";
import {
  EXAMINATION_STATUS_LABEL,
  type Examination,
  type ExaminationStatus,
} from "@/types/examination";

const PAGE_SIZE = 20;
/** Radix Select forbids value="", so this stands in for "no filter". */
const ANY = "__all__";

const STATUS_TONE: Record<ExaminationStatus, "default" | "secondary" | "outline" | "destructive"> = {
  draft: "outline",
  scheduled: "secondary",
  marks_entry: "secondary",
  published: "default",
  cancelled: "destructive",
};

export default function ExaminationsPage() {
  const router = useRouter();
  const { hasPermission } = useAuth();
  const { academicYearId } = useActiveAcademicYear();
  const { data: cycles = [] } = useAcademicCycles(academicYearId ?? undefined);

  const [cycleId, setCycleId] = useState<string>(ANY);
  const [status, setStatus] = useState<string>(ANY);
  const [page, setPage] = useState(1);
  const [wizardOpen, setWizardOpen] = useState(false);

  const canManage = hasPermission("examination.manage");

  const filters = useMemo(
    () => ({
      academicCycleId: cycleId === ANY ? null : cycleId,
      status: status === ANY ? null : (status as ExaminationStatus),
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    }),
    [cycleId, status, page],
  );

  const { data, isLoading, isError, refetch } = useExaminations(filters);

  // The wizard needs a cycle to create in. A filtered list already names one;
  // otherwise the school's only cycle is unambiguous, and beyond that the
  // person has to say which.
  const wizardCycleId =
    cycleId !== ANY ? cycleId : cycles.length === 1 ? cycles[0].id : "";

  const { data: sectionsPage } = useClassesList({
    academic_year_id: academicYearId ?? undefined,
    per_page: 200,
  });
  const { data: subjects = [] } = useSubjects();

  // Every section of the active year. The server refuses any that belong to a
  // different cycle than the examination (`CLASS_WRONG_CYCLE`), so this does
  // not re-derive that rule — it only offers the year's sections to pick from.
  const sections = sectionsPage?.items ?? [];

  const columns: DataTableColumn<Examination>[] = [
    {
      key: "name",
      header: "Examination",
      cell: (row: Examination) => row.name,
    },
    {
      key: "status",
      header: "Status",
      cell: (row: Examination) => (
        <Badge variant={STATUS_TONE[row.status]}>
          {EXAMINATION_STATUS_LABEL[row.status]}
        </Badge>
      ),
    },
    {
      key: "cycle",
      header: "Academic cycle",
      cell: (row: Examination) =>
        cycles.find((cycle) => cycle.id === row.academicCycleId)?.name ?? "—",
    },
    {
      key: "sections",
      header: "Sections",
      cell: (row: Examination) => row.classesSitting?.length ?? 0,
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Examinations"
        description="Schedule an examination and the papers each section sits."
        actions={
          canManage ? (
            <Button
              onClick={() => setWizardOpen(true)}
              disabled={!wizardCycleId}
              title={
                wizardCycleId
                  ? undefined
                  : "Choose an academic cycle to create an examination in"
              }
            >
              <Plus className="mr-1 h-4 w-4" /> Create examination
            </Button>
          ) : null
        }
      />

      <Card>
        <CardContent className="flex flex-wrap gap-3 p-4">
          <div className="min-w-48">
            <label className="mb-1 block text-xs text-muted-foreground" htmlFor="cycle-filter">
              Academic cycle
            </label>
            <Select
              value={cycleId}
              onValueChange={(next) => {
                setCycleId(next);
                setPage(1);
              }}
            >
              <SelectTrigger id="cycle-filter">
                <SelectValue placeholder="All cycles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>All cycles</SelectItem>
                {cycles.map((cycle) => (
                  <SelectItem key={cycle.id} value={cycle.id}>
                    {cycle.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-48">
            <label className="mb-1 block text-xs text-muted-foreground" htmlFor="status-filter">
              Status
            </label>
            <Select
              value={status}
              onValueChange={(next) => {
                setStatus(next);
                setPage(1);
              }}
            >
              <SelectTrigger id="status-filter">
                <SelectValue placeholder="Any status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>Any status</SelectItem>
                {(
                  Object.keys(EXAMINATION_STATUS_LABEL) as ExaminationStatus[]
                ).map((value) => (
                  <SelectItem key={value} value={value}>
                    {EXAMINATION_STATUS_LABEL[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <DataTable
        columns={columns}
        data={data?.nodes ?? []}
        getRowId={(row) => row.id}
        isLoading={isLoading}
        isError={isError}
        errorMessage="Couldn't load examinations."
        onRetry={() => refetch()}
        emptyMessage="No examinations found."
        onRowClick={(row) => router.push(`/examinations/${row.id}`)}
        pagination={{
          page,
          pageSize: PAGE_SIZE,
          total: data?.totalCount ?? 0,
          onPageChange: setPage,
        }}
      />

      {wizardOpen && wizardCycleId && (
        <CreateExaminationWizard
          open={wizardOpen}
          onClose={() => setWizardOpen(false)}
          academicCycleId={wizardCycleId}
          sections={sections}
          subjects={subjects.map((subject) => ({
            id: subject.id,
            name: subject.name,
          }))}
          onCreated={(id) => {
            setWizardOpen(false);
            router.push(`/examinations/${id}`);
          }}
        />
      )}
    </div>
  );
}
