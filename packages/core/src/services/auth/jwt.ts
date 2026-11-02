import { errors, jwtVerify, SignJWT, type JWTPayload } from 'jose';
import type { AppEnv } from '../../config/env';
import { ServiceUnavailableError } from '../../http/errors';

/**
 * The `jose` machinery shared by the session (primitives B2) and purpose-token (B5)
 * services. Internal to `services/auth` — not exported from a barrel.
 *
 * One algorithm, fixed on both sides: signing always uses HS256 and verification
 * accepts only HS256, so a token's header can never select a different algorithm.
 */
const ALGORITHM = 'HS256';

/** The env slice a signing service depends on. */
export type SigningEnv = Pick<AppEnv, 'SESSION_SECRET' | 'SESSION_SECRET_PREVIOUS'>;

export interface SigningKeys {
  /** `SESSION_SECRET` — the only key anything is ever signed with. */
  current: Uint8Array;
  /** `SESSION_SECRET`, then `SESSION_SECRET_PREVIOUS` when set — accepted on verify. */
  verify: readonly Uint8Array[];
}

const encoder = new TextEncoder();

/**
 * The key family from `SESSION_SECRET` (+ `_PREVIOUS` for rotation). Without
 * `SESSION_SECRET` nothing can be signed or trusted, so the caller fails closed
 * with a 503 rather than inventing a key.
 */
export function signingKeys(env: SigningEnv): SigningKeys {
  if (!env.SESSION_SECRET) {
    throw new ServiceUnavailableError('Sign-in is not configured: SESSION_SECRET is not set');
  }
  const current = encoder.encode(env.SESSION_SECRET);
  return {
    current,
    verify: env.SESSION_SECRET_PREVIOUS
      ? [current, encoder.encode(env.SESSION_SECRET_PREVIOUS)]
      : [current],
  };
}

export interface SignJwtClaims {
  audience: string;
  subject: string;
  issuedAt: Date;
  expiresAt: Date;
  /** Extra private claims (e.g. the session version `sv`). */
  payload?: JWTPayload;
}

/** Sign an HS256 JWT carrying `aud`, `sub`, `iat` and `exp`. */
export function signJwt(claims: SignJwtClaims, key: Uint8Array): Promise<string> {
  return new SignJWT(claims.payload ?? {})
    .setProtectedHeader({ alg: ALGORITHM, typ: 'JWT' })
    .setAudience(claims.audience)
    .setSubject(claims.subject)
    .setIssuedAt(claims.issuedAt)
    .setExpirationTime(claims.expiresAt)
    .sign(key);
}

export interface VerifyJwtOptions {
  /** The one audience this verifier accepts. */
  audience: string;
  /** "Now", from the service's injected clock. */
  currentDate: Date;
  /** Claims that must be present in addition to `aud`, `sub`, `iat` and `exp`. */
  requiredClaims?: readonly string[];
}

/**
 * Verify `token` against each key in turn. Only a signature mismatch moves on to the
 * next key: a token whose signature checks out but is expired, or meant for another
 * audience, fails right there. Throws the last `jose` error when nothing verifies.
 */
export async function verifyJwt(
  token: string,
  keys: readonly Uint8Array[],
  options: VerifyJwtOptions,
): Promise<JWTPayload> {
  let failure: unknown;
  for (const key of keys) {
    try {
      const { payload } = await jwtVerify(token, key, {
        algorithms: [ALGORITHM],
        audience: options.audience,
        currentDate: options.currentDate,
        requiredClaims: ['sub', 'iat', 'exp', ...(options.requiredClaims ?? [])],
      });
      return payload;
    } catch (error) {
      if (!(error instanceof errors.JWSSignatureVerificationFailed)) {
        throw error;
      }
      failure = error;
    }
  }
  throw failure;
}
