import { beforeEach, describe, expect, it, vi } from "vitest";
import { createOrmConfig } from "./config";
import { entities } from "./entities";

const DATABASE_URL = "postgresql://postgres@localhost:5432/mentio";

beforeEach(() => {
  vi.stubEnv("DATABASE_URL", DATABASE_URL);
  vi.stubEnv("DB_POOL_MIN", "2");
  vi.stubEnv("DB_POOL_MAX", "5");
  vi.stubEnv("DB_POOL_IDLE_TIMEOUT_MS", "1000");
  vi.stubEnv("DB_DEBUG", "true");
});

describe("createOrmConfig", () => {
  it("builds the config from the validated database environment", () => {
    expect(createOrmConfig()).toMatchObject({
      clientUrl: DATABASE_URL,
      entities,
      pool: { min: 2, max: 5, idleTimeoutMillis: 1000 },
      debug: true,
    });
  });

  it("lets callers override settings", () => {
    expect(createOrmConfig({ debug: false, pool: { max: 1 } })).toMatchObject({
      debug: false,
      pool: { max: 1 },
    });
  });

  it("fails on an invalid environment", () => {
    vi.stubEnv("DATABASE_URL", "not-a-url");
    expect(() => createOrmConfig()).toThrow(/Invalid database environment/);
  });
});
