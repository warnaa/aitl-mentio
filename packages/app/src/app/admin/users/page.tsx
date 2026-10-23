import type { Metadata } from "next";
import { UsersTable } from "./users-table";

export const metadata: Metadata = {
  title: "Users",
};

export default function UsersPage() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
        <p className="text-sm text-muted-foreground">Everyone with an account, newest first.</p>
      </div>
      <UsersTable />
    </div>
  );
}
