import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@devmentor/ui";
import { checkDbConnection, getEnv } from "@devmentor/core";
import { requirePageRole } from "../../lib/session";

// Touches the DB — keep it out of the static prerender.
export const dynamic = "force-dynamic";

/**
 * Operators only. The database card still degrades to "Unavailable" rather than
 * failing, but the guard comes first: with a session cookie and no database, the
 * session cannot be checked and the error page renders instead (fail closed).
 */
export default async function AdminDashboard() {
  await requirePageRole("operator", "/admin");
  const env = getEnv();
  const db = await checkDbConnection();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Overview of the {env.APP_NAME} instance.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Environment</CardTitle>
            <CardDescription>Runtime configuration</CardDescription>
          </CardHeader>
          <CardContent className="text-sm">{env.NODE_ENV}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Database</CardTitle>
            <CardDescription>Connection status</CardDescription>
          </CardHeader>
          <CardContent className="text-sm">
            {db.ok ? (
              <span className="text-emerald-600 dark:text-emerald-400">Connected</span>
            ) : (
              <span className="text-destructive">Unavailable</span>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
