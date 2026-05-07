"use client";

import { useState, useEffect } from "react";
import { Download, RotateCcw, Search } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/hooks";
import { useAuditLogs } from "@/hooks/useAuditLogs";
import { useSchoolUnits } from "@/hooks/useSchoolUnits";
import { auditLogService, type AuditLogEntry, type AuditLogFilters } from "@/services/auditLogService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const KNOWN_MODULES = [
  "students",
  "classes",
  "teachers",
  "fees",
  "school_setup",
  "users",
  "auth",
];

const KNOWN_ACTIONS = [
  "create",
  "update",
  "delete",
  "login",
  "logout",
  "export",
  "import",
];

const PAGE_SIZE = 20;

function defaultDateFrom(): string {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().split("T")[0];
}

function defaultDateTo(): string {
  return new Date().toISOString().split("T")[0];
}

function formatTimestamp(isoString: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(isoString));
  } catch {
    return isoString;
  }
}

interface ExpandedRowProps {
  entry: AuditLogEntry;
}

function MetaRow({ entry }: ExpandedRowProps) {
  return (
    <tr className="bg-muted/50">
      <td colSpan={6} className="px-4 py-3">
        <div className="text-xs font-medium text-muted-foreground mb-1">Details</div>
        {entry.meta ? (
          <pre className="text-xs bg-background rounded border p-3 overflow-x-auto max-h-64 whitespace-pre-wrap">
            {JSON.stringify(entry.meta, null, 2)}
          </pre>
        ) : (
          <p className="text-xs text-muted-foreground italic">No additional details.</p>
        )}
      </td>
    </tr>
  );
}

function ForbiddenCard() {
  return (
    <Card className="max-w-md mx-auto mt-12">
      <CardHeader>
        <CardTitle>Access Denied</CardTitle>
        <CardDescription>
          You do not have permission to view the audit log.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

export default function AuditLogPage() {
  const { hasPermission } = useAuth();

  if (!hasPermission("audit_log.view")) {
    return <ForbiddenCard />;
  }

  return <AuditLogContent />;
}

function AuditLogContent() {
  const { data: units } = useSchoolUnits();

  const [dateFrom, setDateFrom] = useState(defaultDateFrom);
  const [dateTo, setDateTo] = useState(defaultDateTo);
  const [selectedModules, setSelectedModules] = useState<string>("");
  const [selectedActions, setSelectedActions] = useState<string>("");
  const [userId, setUserId] = useState("");
  const [unitId, setUnitId] = useState("");
  const [page, setPage] = useState(1);

  // Applied filters (only updated on "Apply")
  const [appliedFilters, setAppliedFilters] = useState<AuditLogFilters>({
    date_from: defaultDateFrom(),
    date_to: defaultDateTo(),
    page: 1,
    page_size: PAGE_SIZE,
  });

  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  const { data, isLoading, isFetching } = useAuditLogs(appliedFilters);

  const rows = data?.data ?? [];
  const pagination = data?.pagination;
  const totalPages = pagination?.total_pages ?? 1;

  function handleApply() {
    const modules = selectedModules
      .split(",")
      .map((m) => m.trim())
      .filter(Boolean);
    const actions = selectedActions
      .split(",")
      .map((a) => a.trim())
      .filter(Boolean);

    setPage(1);
    setAppliedFilters({
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      module: modules.length > 0 ? modules : undefined,
      action: actions.length > 0 ? actions : undefined,
      user_id: userId.trim() || undefined,
      unit_id: unitId || undefined,
      page: 1,
      page_size: PAGE_SIZE,
    });
  }

  function handleReset() {
    const newDateFrom = defaultDateFrom();
    const newDateTo = defaultDateTo();
    setDateFrom(newDateFrom);
    setDateTo(newDateTo);
    setSelectedModules("");
    setSelectedActions("");
    setUserId("");
    setUnitId("");
    setPage(1);
    setAppliedFilters({
      date_from: newDateFrom,
      date_to: newDateTo,
      page: 1,
      page_size: PAGE_SIZE,
    });
  }

  function handlePageChange(newPage: number) {
    setPage(newPage);
    setAppliedFilters((prev) => ({ ...prev, page: newPage }));
  }

  function toggleRow(id: string) {
    setExpandedRowId((prev) => (prev === id ? null : id));
  }

  const handleExport = async () => {
    try {
      const blob = await auditLogService.exportXlsx(appliedFilters);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit-log-${new Date().toISOString().split("T")[0]}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Failed to export audit log");
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Audit Log</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track all system actions and changes.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" />
          Export to Excel
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {/* Date From */}
            <div className="space-y-1.5">
              <Label htmlFor="date-from">From</Label>
              <Input
                id="date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>

            {/* Date To */}
            <div className="space-y-1.5">
              <Label htmlFor="date-to">To</Label>
              <Input
                id="date-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>

            {/* Unit */}
            {units && units.length > 1 && (
              <div className="space-y-1.5">
                <Label htmlFor="unit-select">Unit</Label>
                <Select value={unitId} onValueChange={setUnitId}>
                  <SelectTrigger id="unit-select">
                    <SelectValue placeholder="All units" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All units</SelectItem>
                    {units.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Module */}
            <div className="space-y-1.5">
              <Label htmlFor="module-input">
                Module{" "}
                <span className="text-muted-foreground font-normal text-xs">
                  (comma-separated)
                </span>
              </Label>
              <Input
                id="module-input"
                placeholder={KNOWN_MODULES.join(", ")}
                value={selectedModules}
                onChange={(e) => setSelectedModules(e.target.value)}
              />
            </div>

            {/* Action */}
            <div className="space-y-1.5">
              <Label htmlFor="action-input">
                Action{" "}
                <span className="text-muted-foreground font-normal text-xs">
                  (comma-separated)
                </span>
              </Label>
              <Input
                id="action-input"
                placeholder={KNOWN_ACTIONS.join(", ")}
                value={selectedActions}
                onChange={(e) => setSelectedActions(e.target.value)}
              />
            </div>

            {/* User ID */}
            <div className="space-y-1.5">
              <Label htmlFor="user-id-input">User ID</Label>
              <Input
                id="user-id-input"
                placeholder="Search by user ID"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 mt-4">
            <Button size="sm" onClick={handleApply}>
              <Search className="mr-2 h-4 w-4" />
              Apply Filters
            </Button>
            <Button size="sm" variant="ghost" onClick={handleReset}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
              Loading…
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              <p className="text-muted-foreground text-sm">No audit log entries found.</p>
              <p className="text-muted-foreground text-xs">Try adjusting the filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">
                      Timestamp
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">
                      User
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">
                      Module
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">
                      Action
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Description
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">
                      Unit
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rows.map((row) => (
                    <>
                      <tr
                        key={row.id}
                        className="hover:bg-muted/30 cursor-pointer transition-colors"
                        onClick={() => toggleRow(row.id)}
                        aria-expanded={expandedRowId === row.id}
                      >
                        <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground">
                          {formatTimestamp(row.created_at)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="font-medium">{row.actor_name}</div>
                          <div className="text-xs text-muted-foreground">{row.actor_role}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10 dark:bg-blue-900/20 dark:text-blue-300 dark:ring-blue-500/20">
                            {row.module}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-0.5 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10 dark:bg-gray-900/20 dark:text-gray-300 dark:ring-gray-500/20">
                            {row.action}
                          </span>
                        </td>
                        <td className="px-4 py-3 max-w-xs truncate" title={row.description}>
                          {row.description}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground">
                          {units?.find((u) => u.id === row.unit_id)?.name ?? row.unit_id ?? "—"}
                        </td>
                      </tr>
                      {expandedRowId === row.id && (
                        <MetaRow key={`${row.id}-meta`} entry={row} />
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {!isLoading && rows.length > 0 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-muted-foreground">
            Page {page} of {totalPages}
            {pagination && (
              <span className="ml-2 text-xs">
                ({pagination.total_items} total)
              </span>
            )}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || isFetching}
              onClick={() => handlePageChange(page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages || isFetching}
              onClick={() => handlePageChange(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
