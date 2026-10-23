import { describe, expect, it } from "vitest";
import { readDbEnv } from "./env";

const DATABASE_URL = "postgresql://postgres@localhost:5432/mentio";

describe("readDbEnv", () => {
  it("applies pool defaults, treating empty values as unset", () => {
    expect(readDbEnv({ DATABASE_URL, DB_POOL_MAX: "", DB_DEBUG: "" })).toEqual({
      DATABASE_URL,
      DB_POOL_MIN: 0,
      DB_POOL_MAX: 10,
      DB_POOL_IDLE_TIMEOUT_MS: 30_000,
      DB_DEBUG: false,
    });
  });

  it("parses explicit values", () => {
    expect(readDbEnv({ DATABASE_URL, DB_POOL_MAX: "25", DB_DEBUG: "true" })).toMatchObject({
      DB_POOL_MAX: 25,
      DB_DEBUG: true,
    });
  });

  it.each([{}, { DATABASE_URL: "mysql://localhost/mentio" }, { DATABASE_URL, DB_POOL_MAX: "0" }])(
    "rejects invalid settings %j",
    (env) => {
      expect(() => readDbEnv(env)).toThrow(/Invalid database environment/);
    },
  );
});
