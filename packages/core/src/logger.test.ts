import { Writable } from "node:stream";
import { describe, expect, it } from "vitest";
import { createLogger } from "./logger";

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
