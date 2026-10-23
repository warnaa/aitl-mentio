import { z } from "zod";

// Database settings only. `db` must not import `core`, so it validates its own slice
// of the environment; app-level settings live in `@mentio/core/config`.
/** `KEY=` in an env file means "not set", not "set to an empty string". */
const unsetIfEmpty = <T extends z.ZodType>(schema: T) =>
  z.preprocess((value) => (value === "" ? undefined : value), schema);

const dbEnvSchema = z.object({
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  DB_POOL_MIN: unsetIfEmpty(z.coerce.number().int().min(0).default(0)),
  DB_POOL_MAX: unsetIfEmpty(z.coerce.number().int().min(1).default(10)),
  DB_POOL_IDLE_TIMEOUT_MS: unsetIfEmpty(z.coerce.number().int().min(0).default(30_000)),
  DB_DEBUG: unsetIfEmpty(z.stringbool().default(false)),
});

export type DbEnv = z.infer<typeof dbEnvSchema>;

export function readDbEnv(env: NodeJS.ProcessEnv = process.env): DbEnv {
  const result = dbEnvSchema.safeParse(env);
  if (!result.success) {
    throw new Error(`Invalid database environment:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}
