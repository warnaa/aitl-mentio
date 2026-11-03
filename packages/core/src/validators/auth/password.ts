import { z } from 'zod';

/**
 * The longest password accepted, in **UTF-8 bytes** — not characters. An unbounded
 * string fed to a deliberately expensive hash is free amplification, and it bounds the
 * input to the hashing gate. Counted with `TextEncoder`, so the schema runs unchanged in
 * the browser (`CrudForm`) and on the server.
 */
export const PASSWORD_MAX_BYTES = 72;
/** The shortest password a new account may choose. */
export const PASSWORD_MIN_LENGTH = 12;

const utf8Bytes = (value: string) => new TextEncoder().encode(value).length;

/** A password as typed: never trimmed — a leading or trailing space is part of it. */
export const passwordField = z
  .string()
  .refine((value) => utf8Bytes(value) <= PASSWORD_MAX_BYTES, `Use at most ${PASSWORD_MAX_BYTES} bytes.`);

/** An email address, trimmed and lower-cased, so lookups and rate-limit keys agree. */
export const emailField = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email('Enter a valid email address.').max(254, 'Enter a valid email address.'));

/** Where to go after signing in; re-validated by `safeReturnTo` on the server. */
export const returnToField = z.string().max(2048).optional();
