import { z } from "zod";

// The JSON envelope is a shape convention shared with `@mentio/core/http`
// (`ui` must not import `core`), so it is declared — and validated — here too.

export type FieldErrors = Record<string, string[]>;

export interface ApiErrorBody {
  code: string;
  message: string;
  fieldErrors?: FieldErrors;
}

export type ApiResult<T> =
  | { ok: true; data: T; status: number }
  | { ok: false; error: ApiErrorBody; status: number };

/** Shape every paginated list endpoint returns. */
export interface Page<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export const envelopeSchema = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true), data: z.unknown() }),
  z.object({
    ok: z.literal(false),
    error: z.object({
      code: z.string(),
      message: z.string(),
      fieldErrors: z.record(z.string(), z.array(z.string())).optional(),
    }),
  }),
]);
