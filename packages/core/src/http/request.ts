import { z } from "zod";
import { ValidationError, type FieldErrors } from "./errors";

/** Validates `input` against `schema`; throws `ValidationError` with per-field messages. */
export function parseWith<S extends z.ZodType>(schema: S, input: unknown): z.output<S> {
  const result = schema.safeParse(input);
  if (result.success) return result.data;

  const { formErrors, fieldErrors } = z.flattenError(result.error);
  throw new ValidationError(formErrors[0] ?? "Validation failed", fieldErrors as FieldErrors);
}

/** Parses the JSON body through `schema`. Only the schema's output reaches the caller (no mass assignment). */
export async function parseJsonBody<S extends z.ZodType>(req: Request, schema: S): Promise<z.output<S>> {
  let body: unknown;
  try {
    body = await req.json();
  } catch (error) {
    throw new ValidationError("Request body must be valid JSON", undefined, { cause: error });
  }
  return parseWith(schema, body);
}

export function parseSearchParams<S extends z.ZodType>(req: Request, schema: S): z.output<S> {
  return parseWith(schema, Object.fromEntries(new URL(req.url).searchParams));
}
