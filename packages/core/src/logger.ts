import pino, { type DestinationStream, type Logger } from "pino";
import { getLogLevel } from "./config/env";

/**
 * Field paths that must never reach a log line (secrets, credentials, tokens).
 * Keep in sync with anything auth-related that gets logged.
 */
export const REDACTED_PATHS = [
  "password",
  "passwordHash",
  "token",
  "accessToken",
  "refreshToken",
  "jwt",
  "secret",
  "authorization",
  "cookie",
  "*.password",
  "*.passwordHash",
  "*.token",
  "*.accessToken",
  "*.refreshToken",
  "*.jwt",
  "*.secret",
  "*.authorization",
  "*.cookie",
  "headers.authorization",
  "headers.cookie",
  'headers["set-cookie"]',
  "req.headers.authorization",
  "req.headers.cookie",
];

export function createLogger(options: { level?: string; destination?: DestinationStream } = {}): Logger {
  return pino(
    {
      level: options.level ?? getLogLevel(),
      redact: { paths: REDACTED_PATHS, censor: "[redacted]" },
    },
    options.destination,
  );
}

const globalForLogger = globalThis as typeof globalThis & { __mentioLogger?: Logger };

/** Process-wide logger. Also registered on the DI cradle as `logger`. */
export function getLogger(): Logger {
  globalForLogger.__mentioLogger ??= createLogger();
  return globalForLogger.__mentioLogger;
}

export type { Logger };
