import { describe, expect, it } from "vitest";
import { getLogLevel, parseEnv } from "./env";

describe("parseEnv", () => {
  it("applies defaults", () => {
    expect(parseEnv({})).toEqual({ NODE_ENV: "development", LOG_LEVEL: "info" });
  });

  it("rejects a JWT secret shorter than 32 bytes", () => {
    expect(() => parseEnv({ JWT_SECRET: "too-short" })).toThrow(/JWT_SECRET/);
  });

  it("accepts a 32-byte JWT secret", () => {
    expect(parseEnv({ JWT_SECRET: "x".repeat(32) }).JWT_SECRET).toHaveLength(32);
  });

  it("treats empty values (KEY= in an env file) as unset", () => {
    expect(parseEnv({ JWT_SECRET: "", LOG_LEVEL: "", NODE_ENV: "" })).toEqual({
      NODE_ENV: "development",
      LOG_LEVEL: "info",
    });
  });

  it("reads the log level even when an unrelated setting is invalid", () => {
    expect(getLogLevel({ LOG_LEVEL: "warn", JWT_SECRET: "too-short" })).toBe("warn");
  });
});
