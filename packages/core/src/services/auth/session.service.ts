import type { AppEnv } from '../../config/env';
import type { Clock } from '../../time/clock';
import { signingKeys, signJwt, verifyJwt, type SigningEnv } from './jwt';

/** The session cookie's name — a §7 surface, kept from before E01. */
export const SESSION_COOKIE_NAME = 'devmentor_session';

/** The `aud` every session token carries and the session verifier demands. */
export const SESSION_AUDIENCE = 'session';

/** Sessions last 24 hours; there is no refresh flow. */
export const SESSION_TTL_SECONDS = 24 * 60 * 60;

/** What a verified session token proves. Roles are deliberately absent. */
export interface SessionClaims {
  /** `sub` — the user's id. */
  userId: string;
  /** `sv` — compared with `users.session_version` by the live-session check. */
  sessionVersion: number;
  issuedAt: Date;
  expiresAt: Date;
}

export interface IssuedSession {
  /** The complete `Set-Cookie` header value. */
  cookie: string;
  expiresAt: Date;
}

/**
 * Read the raw session token out of a `Cookie` request header. Returns `null` when the
 * header is absent or carries no non-empty `devmentor_session`. This is parsing only:
 * the value is untrusted until `SessionService.verify` accepts it.
 */
export function readSessionCookie(cookieHeader: string | null | undefined): string | null {
  if (!cookieHeader) {
    return null;
  }
  for (const pair of cookieHeader.split(';')) {
    const separator = pair.indexOf('=');
    if (separator === -1 || pair.slice(0, separator).trim() !== SESSION_COOKIE_NAME) {
      continue;
    }
    const value = pair.slice(separator + 1).trim();
    return value === '' ? null : value;
  }
  return null;
}

/**
 * Signed session cookies (primitives spec B2). A session is a stateless `jose` HS256
 * JWT `{ sub, sv, aud: 'session', iat, exp }`, signed with `SESSION_SECRET` and
 * accepted on verify with `SESSION_SECRET_PREVIOUS` too, so a secret rotation does not
 * sign everyone out.
 *
 * `verify` is pure and DB-free: signature, audience and expiry only. Revocation —
 * comparing `sv` with the stored `session_version` — and loading the current roles are
 * the live-session check's job (B3), never this service's.
 *
 * `core` cannot use Next's cookie helpers, so the `Set-Cookie` strings are built here.
 */
export class SessionService {
  private readonly env: SigningEnv & Pick<AppEnv, 'NODE_ENV'>;
  private readonly clock: Clock;

  constructor({ env, clock }: { env: SigningEnv & Pick<AppEnv, 'NODE_ENV'>; clock: Clock }) {
    this.env = env;
    this.clock = clock;
  }

  /**
   * Sign a 24-hour session for `user` and build its `Set-Cookie` value. Always signs
   * with `SESSION_SECRET`, never `_PREVIOUS`.
   *
   * @throws ServiceUnavailableError when `SESSION_SECRET` is not configured.
   */
  async issue(user: { id: string; sessionVersion: number }): Promise<IssuedSession> {
    const { current } = signingKeys(this.env);
    const issuedAtSeconds = Math.floor(this.clock.now().getTime() / 1000);
    const expiresAt = new Date((issuedAtSeconds + SESSION_TTL_SECONDS) * 1000);
    const token = await signJwt(
      {
        audience: SESSION_AUDIENCE,
        subject: user.id,
        issuedAt: new Date(issuedAtSeconds * 1000),
        expiresAt,
        payload: { sv: user.sessionVersion },
      },
      current,
    );
    return {
      cookie: this.serialize(token, { maxAgeSeconds: SESSION_TTL_SECONDS, expiresAt }),
      expiresAt,
    };
  }

  /**
   * Verify a raw session token — the cookie *value*, e.g. from Next's
   * `cookies().get(SESSION_COOKIE_NAME)?.value`. Returns `null` for an absent, empty,
   * malformed, tampered, expired or non-session token.
   *
   * @throws ServiceUnavailableError when a token is present but `SESSION_SECRET` is not
   *   configured; an absent token returns `null` without needing the secret.
   */
  async verify(token: string | null | undefined): Promise<SessionClaims | null> {
    if (!token) {
      return null;
    }
    const keys = signingKeys(this.env);
    let payload;
    try {
      payload = await verifyJwt(token, keys.verify, {
        audience: SESSION_AUDIENCE,
        currentDate: this.clock.now(),
        requiredClaims: ['sv'],
      });
    } catch {
      return null;
    }
    const { sub, sv, iat, exp } = payload;
    if (
      typeof sub !== 'string' ||
      sub === '' ||
      typeof sv !== 'number' ||
      !Number.isSafeInteger(sv) ||
      sv < 0
    ) {
      return null;
    }
    // `jose` has already required `iat` and `exp` and checked they are numeric dates.
    return {
      userId: sub,
      sessionVersion: sv,
      issuedAt: new Date((iat as number) * 1000),
      expiresAt: new Date((exp as number) * 1000),
    };
  }

  /** `verify` the session token carried by a request's `Cookie` header. */
  verifyRequest(req: Request): Promise<SessionClaims | null> {
    return this.verify(readSessionCookie(req.headers.get('cookie')));
  }

  /** The `Set-Cookie` value that removes the session cookie. Needs no secret. */
  clear(): string {
    return this.serialize('', { maxAgeSeconds: 0, expiresAt: new Date(0) });
  }

  private serialize(
    value: string,
    { maxAgeSeconds, expiresAt }: { maxAgeSeconds: number; expiresAt: Date },
  ): string {
    const attributes = [
      `${SESSION_COOKIE_NAME}=${value}`,
      'Path=/',
      `Expires=${expiresAt.toUTCString()}`,
      `Max-Age=${maxAgeSeconds}`,
      'HttpOnly',
      'SameSite=Lax',
    ];
    // Plain-HTTP `npm run dev` on localhost could not store a Secure cookie.
    if (this.env.NODE_ENV === 'production') {
      attributes.push('Secure');
    }
    return attributes.join('; ');
  }
}
