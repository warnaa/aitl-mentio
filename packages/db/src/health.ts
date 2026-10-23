import { getOrm } from "./orm";

export type DatabaseStatus = { isUp: true } | { isUp: false; reason: string };

/**
 * Never throws: an unreachable or misconfigured database is reported as down.
 * Runs a real round-trip — MikroORM connects lazily, so `checkConnection()` alone
 * reports "not established" until the first query.
 */
export async function checkDatabase(): Promise<DatabaseStatus> {
  try {
    await (await getOrm()).em.getConnection().execute("select 1");
    return { isUp: true };
  } catch (error) {
    return { isUp: false, reason: error instanceof Error ? error.message : String(error) };
  }
}
