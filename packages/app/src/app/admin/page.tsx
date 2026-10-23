import type { Metadata } from "next";
import Link from "next/link";

import { withScope } from "@mentio/core/container";
import { getLogger } from "@mentio/core/logger";
import { Badge } from "@mentio/ui/components/badge";
import { Button } from "@mentio/ui/components/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@mentio/ui/components/card";
import { ErrorMessage } from "@mentio/ui/backend/feedback";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dashboard",
};

type DashboardData = { isAvailable: true; userCount: number } | { isAvailable: false };

async function loadDashboard(): Promise<DashboardData> {
  try {
    const userCount = await withScope(({ userService }) => userService.count());
    return { isAvailable: true, userCount };
  } catch (error) {
    getLogger().error({ err: error }, "Admin dashboard: failed to load");
    return { isAvailable: false };
  }
}

export default async function AdminPage() {
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

      {data.isAvailable ? (
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
      ) : (
        <ErrorMessage
          title="Database unavailable"
          message="Check DATABASE_URL in .env and run npm run db:migrate. Details are in the server log."
        />
      )}
    </div>
  );
}
