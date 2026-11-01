"use client";

import type { ReactNode } from "react";
import { Button } from "@mentio/ui/components/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@mentio/ui/components/table";
import { EmptyState, ErrorMessage, LoadingMessage } from "../feedback";

export interface DataTableColumn<T> {
  id: string;
  header: ReactNode;
  /** Shown above the value when rows stack (narrow container). Defaults to `header` when it is text. */
  label?: string;
  cell: (row: T) => ReactNode;
  className?: string;
}

export interface DataTablePagination {
  offset: number;
  limit: number;
  total: number;
  onOffsetChange: (offset: number) => void;
}

export interface DataTableProps<T> {
  /** Accessible name of the table; it also names the scroll region when wide content overflows. */
  label?: string;
  columns: DataTableColumn<T>[];
  /** `undefined` while the first load is in flight. */
  rows: T[] | undefined;
  getRowId: (row: T) => string;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  rowActions?: (row: T) => ReactNode;
  pagination?: DataTablePagination;
}

export function DataTable<T>({
  label,
  columns,
  rows,
  getRowId,
  isLoading = false,
  error,
  onRetry,
  emptyTitle = "Nothing here yet",
  emptyDescription,
  rowActions,
  pagination,
}: DataTableProps<T>) {
  // User decision 2026-11-01: a failed refresh keeps the rows already shown, with the error above them.
  const hasRows = rows !== undefined && rows.length > 0;
  if (error && !hasRows) return <ErrorMessage message={error} onRetry={onRetry} />;
  if (!rows) return <LoadingMessage />;
  if (rows.length === 0 && !isLoading) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  // User decision 2026-11-01: below 48rem of its own width a row stacks as a block, each value under its
  // column name. Explicit roles keep the table semantics when CSS changes `display`; the visible
  // column name is aria-hidden because the header association already names the cell.
  const labelOf = (column: DataTableColumn<T>) => column.label ?? (typeof column.header === "string" ? column.header : undefined);
  const cellLabel = (label: string | undefined) => label && <span className="mentio-table-cell-label" aria-hidden="true">{label}</span>;
  return (
    <div className="mentio-data-table flex flex-col gap-3" aria-busy={isLoading}>
      {error && <ErrorMessage message={error} onRetry={onRetry} />}
      <Table role="table" aria-label={label}>
        <TableHeader role="rowgroup">
          <TableRow role="row">
            {columns.map((column) => (
              <TableHead key={column.id} role="columnheader" className={column.className}>
                {column.header}
              </TableHead>
            ))}
            {rowActions && <TableHead role="columnheader" className="text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody role="rowgroup">
          {rows.map((row) => (
            <TableRow key={getRowId(row)} role="row">
              {columns.map((column) => (
                <TableCell key={column.id} role="cell" className={column.className}>
                  {cellLabel(labelOf(column))}
                  <div className="mentio-table-cell-value">{column.cell(row)}</div>
                </TableCell>
              ))}
              {rowActions && <TableCell role="cell" className="text-right">{cellLabel("Actions")}<div className="mentio-table-cell-value">{rowActions(row)}</div></TableCell>}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {pagination && <PaginationControls {...pagination} isDisabled={isLoading} />}
    </div>
  );
}

function PaginationControls({
  offset,
  limit,
  total,
  onOffsetChange,
  isDisabled,
}: DataTablePagination & { isDisabled: boolean }) {
  const first = total === 0 ? 0 : offset + 1;
  const last = Math.min(offset + limit, total);
  const canGoBack = !isDisabled && offset > 0;
  const canGoForward = !isDisabled && offset + limit < total;

  // User decision 2026-11-01: unavailable buttons use aria-disabled, not disabled, so the focused button keeps
  // focus while the next page loads and at either end (WCAG 2.4.3). The range is a polite status, so the new
  // page is announced once it has loaded (WCAG 4.1.3).
  return (
    <div className="mentio-data-table-pagination flex items-center justify-between gap-4 text-sm text-muted-foreground">
      <span role="status">
        {first}–{last} of {total}
      </span>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          aria-disabled={!canGoBack || undefined}
          onClick={() => canGoBack && onOffsetChange(Math.max(0, offset - limit))}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          aria-disabled={!canGoForward || undefined}
          onClick={() => canGoForward && onOffsetChange(offset + limit)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
