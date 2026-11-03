import type { z } from 'zod';
import { BadRequestError, type FieldErrors, ValidationError } from './errors';

/** A zod error as the envelope's `fieldErrors`, keyed by dotted path or `_root`. */
export function flattenZodError(error: z.ZodError): FieldErrors {
  const fieldErrors: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.length ? issue.path.join('.') : '_root';
    (fieldErrors[key] ??= []).push(issue.message);
  }
  return fieldErrors;
}

/** The request's JSON body. @throws BadRequestError (400) when it is not valid JSON. */
export async function readJsonBody(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new BadRequestError('Request body must be valid JSON');
  }
}

/** `data` parsed by `schema`. @throws ValidationError (422) with `fieldErrors`. */
export function parseWith<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new ValidationError('Validation failed', flattenZodError(result.error));
  }
  return result.data;
}

/**
 * The request's JSON body, parsed by `schema` — the one way a route reads input, shared
 * by `makeCrudRoute` and the workflow routes.
 *
 * @throws BadRequestError (not JSON) or ValidationError (422, with `fieldErrors`).
 */
export async function parseJsonBody<T>(req: Request, schema: z.ZodType<T>): Promise<T> {
  return parseWith(schema, await readJsonBody(req));
}
