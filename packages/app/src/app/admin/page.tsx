import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";

import { Badge } from "@mentio/ui/components/badge";
import { Button } from "@mentio/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@mentio/ui/components/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@mentio/ui/components/table";
import { createRequestScope } from "@/server/container";

export const metadata: Metadata = {
  title: "Dashboard",
};

async function loadDashboard() {
  try {
    const scope = await createRequestScope();
    const { userService } = scope.cradle;
    const [userCount, recentUsers] = await Promise.all([
      userService.count(),
      userService.listRecent(),
    ]);
    return { ok: true as const, userCount, recentUsers };
  } catch (error) {
    console.error("[admin] failed to load dashboard", error);
    return { ok: false as const, message: error instanceof Error ? error.message : String(error) };
  }
}

export default async function AdminDashboard() {
  // Always render per request — this page reads from the database.
  await connection();
  const data = await loadDashboard();

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Overview of your Mentio instance.</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/">View site</Link>
        </Button>
      </div>

      {data.ok ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardDescription>Users</CardDescription>
                <CardTitle className="text-3xl tabular-nums">{data.userCount}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Database</CardDescription>
                <CardTitle>
                  <Badge variant="secondary">Connected</Badge>
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent users</CardTitle>
              <CardDescription>The ten most recently created accounts.</CardDescription>
            </CardHeader>
            <CardContent>
              {data.recentUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground">No users yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead className="text-right">Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.recentUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.email}</TableCell>
                        <TableCell>{user.name ?? "—"}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {user.createdAt.toISOString().slice(0, 10)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle>
              <Badge variant="destructive">Database unavailable</Badge>
            </CardTitle>
            <CardDescription>
              Check <code>DATABASE_URL</code> in <code>.env</code> and run{" "}
              <code>npm run db:migrate</code>.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">{data.message}</pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
