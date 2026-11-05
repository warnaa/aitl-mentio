"use client";

import { useEffect, useState } from "react";
import type { Role } from "@devmentor/core";
import { apiCall, DataTable, type Column } from "@devmentor/ui/backend";
import { RoleChips } from "../../../components/auth/SignedInShell";

/**
 * The operator user directory, composed as the prototype's s25 screen. Fetches through
 * `apiCall` (never a raw `fetch`) and renders with `DataTable`, which owns the loading /
 * error / empty states. Colocated with its only consumer, the server `page.tsx` that
 * guards the route before this client component renders; `/api/users` checks the
 * operator role again on its own. The prototype's payout column waits for Stripe Connect
 * (spec A15).
 */
export type UserRow = {
  id: string;
  email: string;
  displayName: string;
  roles: Role[];
};

const columns: Column<UserRow>[] = [
  { key: "displayName", header: "Name" },
  { key: "email", header: "Email" },
  {
    key: "roles",
    header: "Roles",
    render: (row) => <RoleChips roles={row.roles} label={`Roles of ${row.displayName}`} />,
  },
];

export function UsersList() {
  const [rows, setRows] = useState<UserRow[]>();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    apiCall<UserRow[]>("/api/users").then((result) => {
      if (!active) return;
      if (result.ok) {
        setRows(result.data);
      } else {
        setError(result.error.message);
      }
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="dm-product-stack">
      <div className="dm-page-heading">
        <h1>Users</h1>
        <p>
          Accounts and the roles they hold. Mentors join by invitation and operators by configuration, so roles are
          not edited here.
        </p>
      </div>

      <DataTable
        caption="Users"
        columns={columns}
        rows={rows}
        getRowId={(row) => row.id}
        loading={loading}
        error={error}
        emptyMessage="No users yet — seed the database with npm run db:seed."
      />
    </div>
  );
}
