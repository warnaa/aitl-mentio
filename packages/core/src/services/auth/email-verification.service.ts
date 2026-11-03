import { z } from 'zod';
import type { AppEnv } from '../../config/env';
import { BadRequestError } from '../../http/errors';
import type { MailMessage } from '../notifications/mailer.port';
import type { TokenService } from './token.service';

/** The purpose (`aud`) of a verification token; never accepted for anything else. */
export const EMAIL_VERIFY_PURPOSE = 'email-verify';
/** How long a verification link works. */
export const EMAIL_VERIFY_TTL_SECONDS = 24 * 60 * 60;
/** The browser-navigated route a verification link opens. */
export const VERIFY_EMAIL_PATH = '/api/auth/verify-email';

/** What a verification token says. No credential material: no password, no hash. */
export interface VerificationClaims {
  userId: string;
  /**
   * The user's `sessionVersion` when the link was made. Re-registering an unverified
   * address bumps it, so a link sent *before* someone else overwrote the password
   * cannot verify the account under that new password.
   */
  version: number;
  /** Where to land once verified; re-validated by `safeReturnTo`. */
  returnTo?: string;
}

const claimsSchema = z.object({
  userId: z.string().min(1),
  version: z.number().int().min(0),
  returnTo: z.string().optional(),
});

export interface EmailVerificationDeps {
  tokenService: Pick<TokenService, 'signPurposeToken' | 'verifyPurposeToken'>;
  env: Pick<AppEnv, 'APP_URL'>;
}

/**
 * Email-verification links (E01 #32, step 25): a purpose token on `TokenService`, so it
 * is signed with the session secret family, expires, and is refused for any other
 * purpose. This service only makes and reads links and the message; `UserService`
 * marks the row verified and the route issues the session.
 */
export class EmailVerificationService {
  private readonly tokenService: EmailVerificationDeps['tokenService'];
  private readonly env: Pick<AppEnv, 'APP_URL'>;

  constructor({ tokenService, env }: EmailVerificationDeps) {
    this.tokenService = tokenService;
    this.env = env;
  }

  /** The absolute verification link for `user` at its current `sessionVersion`. */
  async link(user: { id: string; sessionVersion: number }, returnTo?: string): Promise<string> {
    const claims: VerificationClaims = { userId: user.id, version: user.sessionVersion, ...(returnTo ? { returnTo } : {}) };
    const token = await this.tokenService.signPurposeToken({
      purpose: EMAIL_VERIFY_PURPOSE,
      subject: JSON.stringify(claims),
      ttlSeconds: EMAIL_VERIFY_TTL_SECONDS,
    });
    return `${this.env.APP_URL}${VERIFY_EMAIL_PATH}?token=${encodeURIComponent(token)}`;
  }

  /** The plain-text verification message. */
  message(to: string, displayName: string, link: string): MailMessage {
    return {
      to,
      subject: 'Confirm your DevMentor email address',
      text: [
        `Hi ${displayName},`,
        '',
        'Open this link to confirm your email address and finish creating your DevMentor account:',
        '',
        link,
        '',
        'The link works for 24 hours. If you did not create a DevMentor account, ignore this email and nothing will be activated.',
      ].join('\n'),
    };
  }

  /**
   * The claims of a verification token.
   *
   * @throws BadRequestError for a malformed, tampered, expired or wrong-purpose token,
   *   or one whose subject is not verification claims.
   * @throws ServiceUnavailableError when `SESSION_SECRET` is not configured.
   */
  async read(token: string): Promise<VerificationClaims> {
    const { subject } = await this.tokenService.verifyPurposeToken(token, EMAIL_VERIFY_PURPOSE);
    let parsed: unknown;
    try {
      parsed = JSON.parse(subject);
    } catch {
      parsed = undefined;
    }
    const claims = claimsSchema.safeParse(parsed);
    if (!claims.success) {
      throw new BadRequestError('This link is invalid or has expired');
    }
    return claims.data;
  }
}
