import { defineConfig, type Options } from "@mikro-orm/postgresql";
import { entities } from "./entities";
import { readDbEnv } from "./env";

/**
 * Runtime ORM configuration shared by the app and the CLI. Entities are listed
 * explicitly (no folder discovery) so the config works inside the Next.js bundle.
 */
export function createOrmConfig(overrides: Partial<Options> = {}): Options {
  const env = readDbEnv();
  return defineConfig({
    clientUrl: env.DATABASE_URL,
    entities,
    pool: {
      min: env.DB_POOL_MIN,
      max: env.DB_POOL_MAX,
      idleTimeoutMillis: env.DB_POOL_IDLE_TIMEOUT_MS,
    },
    debug: env.DB_DEBUG,
    ...overrides,
  });
}
