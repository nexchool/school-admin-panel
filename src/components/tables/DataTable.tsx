"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, ChevronsUpDown, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

export type SortDirection = "asc" | "desc";

export interface DataTableColumn<T> {
  key: string;
  header: string;
  cell?: (row: T) => React.ReactNode;
  className?: string;
  headerClassName?: string;
  /** When true, the column header becomes clickable and emits onSortChange. */
  sortable?: boolean;
  /** Override the key sent to the server when sorting this column (defaults to `key`). */
  sortKey?: string;
}

export interface DataTableSortState {
  column: string | null;
  direction: SortDirection;
}

export interface DataTablePagination {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  /** When provided, renders a page-size dropdown. */
  pageSizeOptions?: number[];
  onPageSizeChange?: (pageSize: number) => void;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  getRowId: (row: T) => string;
  isLoading?: boolean;
  emptyMessage?: string;
  pagination?: DataTablePagination;
  /** Controlled sort state — provide alongside onSortChange for server-side sort. */
  sort?: DataTableSortState;
  /** Called with the next direction, or null to clear the sort. */
  onSortChange?: (column: string, direction: SortDirection | null) => void;
  onRowClick?: (row: T) => void;
  className?: string;
}

function SortIcon({ state }: { state: "asc" | "desc" | "none" }) {
  if (state === "asc") return <ChevronUp className="size-3.5" />;
  if (state === "desc") return <ChevronDown className="size-3.5" />;
  return <ChevronsUpDown className="size-3.5 opacity-40" />;
}

export function DataTable<T extends object>({
  columns,
  data,
  getRowId,
  isLoading,
  emptyMessage = "No data",
  pagination,
  sort,
  onSortChange,
  onRowClick,
  className,
}: DataTableProps<T>) {
  const totalPages = pagination
    ? Math.ceil(pagination.total / pagination.pageSize) || 1
    : 1;
  const canPrevious = pagination && pagination.page > 1;
  const canNext = pagination && pagination.page < totalPages;

  const handleHeaderClick = (col: DataTableColumn<T>) => {
    if (!col.sortable || !onSortChange) return;
    const sortKey = col.sortKey ?? col.key;
    const current = sort?.column === sortKey ? sort.direction : null;
    // Cycle: none -> asc -> desc -> cleared
    if (current === null) onSortChange(sortKey, "asc");
    else if (current === "asc") onSortChange(sortKey, "desc");
    else onSortChange(sortKey, null);
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[600px] text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              {columns.map((col) => {
                const sortKey = col.sortKey ?? col.key;
                const active = col.sortable && sort?.column === sortKey;
                const iconState: "asc" | "desc" | "none" = active
                  ? sort!.direction
                  : "none";
                return (
                  <th
                    key={col.key}
                    className={cn(
                      "px-4 py-3 text-left font-medium text-foreground",
                      col.sortable && "select-none",
                      col.headerClassName ?? col.className
                    )}
                  >
                    {col.sortable && onSortChange ? (
                      <button
                        type="button"
                        onClick={() => handleHeaderClick(col)}
                        className={cn(
                          "inline-flex items-center gap-1.5 hover:text-foreground/80",
                          active && "text-foreground"
                        )}
                      >
                        {col.header}
                        <SortIcon state={iconState} />
                      </button>
                    ) : (
                      col.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-12 text-center text-muted-foreground"
                >
                  Loading...
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-12 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <tr
                  key={getRowId(row)}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    "border-b border-border transition-colors last:border-0",
                    onRowClick && "cursor-pointer hover:bg-muted/50"
                  )}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn("px-4 py-3", col.className)}
                    >
                      {col.cell
                        ? col.cell(row)
                        : String(((row as Record<string, unknown>)[col.key] ?? "") as string)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && (pagination.total > 0 || pagination.onPageSizeChange) && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>
              {pagination.total === 0
                ? "0 results"
                : `Showing ${(pagination.page - 1) * pagination.pageSize + 1}–${Math.min(
                    pagination.page * pagination.pageSize,
                    pagination.total
                  )} of ${pagination.total}`}
            </span>
            {pagination.pageSizeOptions && pagination.onPageSizeChange && (
              <label className="flex items-center gap-1.5">
                <span className="text-muted-foreground">Rows:</span>
                <select
                  value={pagination.pageSize}
                  onChange={(e) =>
                    pagination.onPageSizeChange!(Number(e.target.value))
                  }
                  className="h-8 rounded-md border border-border bg-background px-2 text-sm"
                >
                  {pagination.pageSizeOptions.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
          {pagination.total > pagination.pageSize && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => pagination.onPageChange(pagination.page - 1)}
                disabled={!canPrevious}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {pagination.page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => pagination.onPageChange(pagination.page + 1)}
                disabled={!canNext}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
