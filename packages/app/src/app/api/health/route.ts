import { checkDatabase } from "@mentio/core/container";
import { apiHandler } from "@mentio/core/http";
import { getLogger } from "@mentio/core/logger";

export const dynamic = "force-dynamic";

// Public liveness + database reachability. Reports only up/down, never the failure reason.
export const GET = apiHandler(async () => {
  const database = await checkDatabase();
  if (!database.isUp) getLogger().warn({ reason: database.reason }, "Health check: database is down");
  return { status: "ok", database: database.isUp ? "up" : "down" } as const;
});
