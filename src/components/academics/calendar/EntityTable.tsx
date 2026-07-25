"use client";

import { Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";

export interface EntityColumn<T> {
  header: string;
  render: (row: T) => React.ReactNode;
}

interface EntityTableProps<T extends { id: string }> {
  columns: EntityColumn<T>[];
  rows: T[];
  emptyMessage: string;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  isLoading?: boolean;
}

/** Compact list table with edit/delete row actions, shared by the calendar
 * wizard steps and the dashboard panels. */
export function EntityTable<T extends { id: string }>({
  columns,
  rows,
  emptyMessage,
  onEdit,
  onDelete,
  isLoading,
}: EntityTableProps<T>) {
  const hasActions = !!onEdit || !!onDelete;

  if (isLoading) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>;
  }
  if (rows.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50 text-left">
            {columns.map((col) => (
              <th key={col.header} className="px-3 py-2 font-medium text-muted-foreground">
                {col.header}
              </th>
            ))}
            {hasActions && (
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-border last:border-0">
              {columns.map((col) => (
                <td key={col.header} className="px-3 py-2">
                  {col.render(row)}
                </td>
              ))}
              {hasActions && (
                <td className="px-3 py-2">
                  <div className="flex justify-end gap-1">
                    {onEdit && (
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Edit"
                        onClick={() => onEdit(row)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    {onDelete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Delete"
                        className="text-destructive hover:text-destructive"
                        onClick={() => onDelete(row)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
