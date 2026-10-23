"use client";

import { useEffect, useState } from "react";
import type { UserDto } from "@mentio/core/services/auth/user.service";
import { apiCall, type ApiResult, type Page } from "@mentio/ui/backend/api";
import { DataTable, type DataTableColumn } from "@mentio/ui/backend/tables";

const PAGE_SIZE = 20;

const columns: DataTableColumn<UserDto>[] = [
  { id: "email", header: "Email", cell: (user) => <span className="font-medium">{user.email}</span> },
  { id: "name", header: "Name", cell: (user) => user.name ?? "—" },
  {
    id: "createdAt",
    header: "Created",
    className: "text-right tabular-nums",
    cell: (user) => user.createdAt.slice(0, 10),
  },
];

interface UsersRequest {
  offset: number;
  /** Bumped by "Try again" to refetch the same page. */
  attempt: number;
}

interface UsersResponse {
  request: UsersRequest;
  result: ApiResult<Page<UserDto>>;
}

// Reference example for list screens: fetch via `apiCall`, render via `DataTable`.
export function UsersTable() {
  const [request, setRequest] = useState<UsersRequest>({ offset: 0, attempt: 0 });
  const [response, setResponse] = useState<UsersResponse>();
  const [page, setPage] = useState<Page<UserDto>>();

  useEffect(() => {
    let isCurrent = true;
    void apiCall<Page<UserDto>>("/api/users", {
      query: { limit: PAGE_SIZE, offset: request.offset },
    }).then((result) => {
      if (!isCurrent) return;
      setResponse({ request, result });
      if (result.ok) setPage(result.data);
    });
    return () => {
      isCurrent = false;
    };
  }, [request]);

  const isLoading = response?.request !== request;
  const failed = !isLoading && response && !response.result.ok ? response.result : undefined;

  return (
    <DataTable
      columns={columns}
      rows={page?.items}
      getRowId={(user) => user.id}
      isLoading={isLoading}
      error={failed && (failed.status === 401 ? "Sign in to view users." : failed.error.message)}
      onRetry={() => setRequest((current) => ({ ...current, attempt: current.attempt + 1 }))}
      emptyTitle="No users yet"
      pagination={
        page && {
          offset: page.offset,
          limit: page.limit,
          total: page.total,
          onOffsetChange: (offset) => setRequest({ offset, attempt: 0 }),
        }
      }
    />
  );
}
