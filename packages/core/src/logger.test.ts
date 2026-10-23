import { Writable } from "node:stream";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createLogger, getLogger } from "./logger";

function captureLogger() {
  const lines: string[] = [];
  const destination = new Writable({
    write(chunk, _encoding, callback) {
      lines.push(chunk.toString());
      callback();
    },
  });
  return { logger: createLogger({ level: "info", destination }), lines };
}

describe("logger", () => {
  it("redacts secrets, tokens and auth headers", () => {
    const { logger, lines } = captureLogger();
    logger.info(
      {
        password: "hunter2",
        user: { email: "ada@example.com", passwordHash: "$2b$12$abc" },
        token: "eyJhbGciOi.payload.signature",
        req: { headers: { cookie: "mentio_session=eyJ...", authorization: "Bearer eyJ..." } },
      },
      "login attempt",
    );
    const output = lines.join("");

    expect(output).not.toMatch(/hunter2|\$2b\$12|eyJ/);
    expect(output).toContain("ada@example.com");
    expect(output).toContain("[redacted]");
  });
});

describe("createLogger", () => {
  it("defaults the level to LOG_LEVEL from the environment", () => {
    vi.stubEnv("LOG_LEVEL", "warn");

    expect(createLogger().level).toBe("warn");
  });
});

describe("getLogger", () => {
  const globalForLogger = globalThis as typeof globalThis & { __mentioLogger?: unknown };

  afterEach(() => {
    delete globalForLogger.__mentioLogger;
  });

  it("returns one process-wide logger", () => {
    delete globalForLogger.__mentioLogger;
    const logger = getLogger();

    expect(getLogger()).toBe(logger);
    expect(globalForLogger.__mentioLogger).toBe(logger);
  });
});
