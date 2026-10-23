import { z } from "zod";
import { ConfigError } from "../http/errors";

/** Minimum HS256 secret length in bytes (RFC 7518 §3.2: key ≥ hash output size). */
const JWT_SECRET_MIN_BYTES = 32;

/** `KEY=` in an env file means "not set", not "set to an empty string". */
const unsetIfEmpty = <T extends z.ZodType>(schema: T) =>
  z.preprocess((value) => (value === "" ? undefined : value), schema);

// Parsed on its own so a bad unrelated setting (e.g. JWT_SECRET) can't break logging.
const logEnvSchema = z.object({
  LOG_LEVEL: unsetIfEmpty(
    z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  ),
});

const appEnvSchema = logEnvSchema.extend({
  NODE_ENV: unsetIfEmpty(z.enum(["development", "test", "production"]).default("development")),
  // Optional at boot so the app builds and starts without auth configured;
  // `getJwtSecret()` fails closed when it is missing.
  JWT_SECRET: unsetIfEmpty(
    z
      .string()
      .refine((value) => Buffer.byteLength(value, "utf8") >= JWT_SECRET_MIN_BYTES, {
        message: `must be at least ${JWT_SECRET_MIN_BYTES} bytes (generate with \`openssl rand -base64 32\`)`,
      })
      .optional(),
  ),
});

export type AppEnv = z.infer<typeof appEnvSchema>;

let cachedEnv: AppEnv | undefined;

/** Parses and caches the app environment. Throws `ConfigError` on invalid values. */
export function getEnv(): AppEnv {
  cachedEnv ??= parseEnv(process.env);
  return cachedEnv;
}

export function parseEnv(env: NodeJS.ProcessEnv): AppEnv {
  return parseWithSchema(appEnvSchema, env);
}

export function getLogLevel(env: NodeJS.ProcessEnv = process.env): AppEnv["LOG_LEVEL"] {
  return parseWithSchema(logEnvSchema, env).LOG_LEVEL;
}

function parseWithSchema<S extends z.ZodType>(schema: S, env: NodeJS.ProcessEnv): z.output<S> {
  const result = schema.safeParse(env);
  if (!result.success) {
    throw new ConfigError(`Invalid environment:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}

export function getJwtSecret(): Uint8Array {
  const secret = getEnv().JWT_SECRET;
  if (!secret) throw new ConfigError("JWT_SECRET is not set");
  return new TextEncoder().encode(secret);
}
