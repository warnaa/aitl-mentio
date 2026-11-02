import { BadRequestError } from '../../http/errors';
import type { Clock } from '../../time/clock';
import { signingKeys, signJwt, verifyJwt, type SigningEnv } from './jwt';
import { SESSION_AUDIENCE } from './session.service';

export interface PurposeTokenInput {
  /** What the token is for (`'oauth-state'`, `'email-verification'`); carried as `aud`. */
  purpose: string;
  /** What the token vouches for (a return path, a user id); carried as `sub`. May be `''`. */
  subject: string;
  /** Lifetime in whole seconds, from the injected clock's "now". */
  ttlSeconds: number;
}

/**
 * Stateless, purpose-bound tokens (primitives spec B5): OAuth `state` and email
 * verification links. Nothing is stored — a token is an HS256 JWT signed with
 * `SESSION_SECRET`, whose purpose is its `aud` and is enforced on verify, so a token
 * minted for one purpose is never accepted for another, nor as a session.
 *
 * A purpose token proves *we issued this claim*, never *this browser is the one we
 * issued it to*. A flow that needs bearer binding (OAuth `state`) pairs it with its
 * own check.
 *
 * The stored, single-use pair (`mintOpaqueToken` / `hashToken`) is deferred to #34.
 */
export class TokenService {
  private readonly env: SigningEnv;
  private readonly clock: Clock;

  constructor({ env, clock }: { env: SigningEnv; clock: Clock }) {
    this.env = env;
    this.clock = clock;
  }

  /**
   * Sign a token for `purpose`. Throws `ServiceUnavailableError` when
   * `SESSION_SECRET` is not configured.
   */
  async signPurposeToken({ purpose, subject, ttlSeconds }: PurposeTokenInput): Promise<string> {
    assertPurpose(purpose);
    if (!Number.isInteger(ttlSeconds) || ttlSeconds <= 0) {
      throw new Error(`ttlSeconds must be a positive integer, got ${ttlSeconds}`);
    }
    const { current } = signingKeys(this.env);
    const issuedAtSeconds = Math.floor(this.clock.now().getTime() / 1000);
    return signJwt(
      {
        audience: purpose,
        subject,
        issuedAt: new Date(issuedAtSeconds * 1000),
        expiresAt: new Date((issuedAtSeconds + ttlSeconds) * 1000),
      },
      current,
    );
  }

  /**
   * Verify a token minted for `purpose` and return its subject. Accepts a token signed
   * with `SESSION_SECRET` or `SESSION_SECRET_PREVIOUS`.
   *
   * @throws BadRequestError for a malformed, tampered, expired or wrong-purpose token
   *   (the `jose` error is the `cause`).
   * @throws ServiceUnavailableError when `SESSION_SECRET` is not configured.
   */
  async verifyPurposeToken(token: string, purpose: string): Promise<{ subject: string }> {
    assertPurpose(purpose);
    const keys = signingKeys(this.env);
    let subject: unknown;
    try {
      ({ sub: subject } = await verifyJwt(token, keys.verify, {
        audience: purpose,
        currentDate: this.clock.now(),
      }));
    } catch (cause) {
      throw new BadRequestError('This link is invalid or has expired', { cause });
    }
    if (typeof subject !== 'string') {
      throw new BadRequestError('This link is invalid or has expired');
    }
    return { subject };
  }
}

/** `'session'` belongs to the session service; a purpose token may never carry it. */
function assertPurpose(purpose: string): void {
  if (purpose === '' || purpose === SESSION_AUDIENCE) {
    throw new Error(`"${purpose}" is not a valid purpose-token purpose`);
  }
}
