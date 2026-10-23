import { readEnv, readIntEnv } from "@mentio/core";
import { defineConfig, type Options } from "@mikro-orm/postgresql";
import { entities } from "./entities";

/**
 * Runtime ORM configuration shared by the app and the CLI. Entities are listed
 * explicitly (no folder discovery) so the config works inside the Next.js bundle.
 */
export function createOrmConfig(overrides: Partial<Options> = {}): Options {
  return defineConfig({
    clientUrl: readEnv("DATABASE_URL"),
    entities,
    pool: {
      min: readIntEnv("DB_POOL_MIN", 0),
      max: readIntEnv("DB_POOL_MAX", 10),
      idleTimeoutMillis: readIntEnv("DB_POOL_IDLE_TIMEOUT_MS", 30_000),
    },
    debug: readEnv("DB_DEBUG", "false") === "true",
    ...overrides,
  });
}
