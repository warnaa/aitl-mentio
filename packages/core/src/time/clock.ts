/**
 * The source of "now" for infrastructure that reasons about time (session expiry,
 * token expiry, rate-limit windows). Services take `{ clock }` from the `Cradle` and
 * read it internally, so tests inject a fixed clock instead of sleeping.
 *
 * Instants are UTC: `now()` returns a plain `Date` and no service constructs a
 * local-time date. Presenting a wall-clock time is the browser's job.
 */
export interface Clock {
  now(): Date;
}

/** The real clock, registered on the `Cradle` as `clock`. */
export const systemClock: Clock = { now: () => new Date() };
