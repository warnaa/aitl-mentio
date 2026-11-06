import type { EntityManager, MikroORM } from '@devmentor/db';
import type { AppEnv } from '../config/env';
import type { Logger } from '../logger';
import type { EventBus } from '../events/event-bus';
import type { Session } from '../http/auth';
import type { RateLimiter } from '../http/rate-limit';
import type { GithubIdentityPort } from '../services/auth/github-identity.port';
import type { EmailVerificationService } from '../services/auth/email-verification.service';
import type { PasswordService } from '../services/auth/password.service';
import type { SessionService } from '../services/auth/session.service';
import type { TokenService } from '../services/auth/token.service';
import type { UserService } from '../services/auth/user.service';
import type { InvitationService } from '../services/invitations/invitation.service';
import type { MentorProfileService } from '../services/mentors/mentor-profile.service';
import type { SlotService } from '../services/availability/slot.service';
import type { BookingService } from '../services/bookings/booking.service';
import type { PaymentService } from '../services/payments/payment.service';
import type { PaymentReportService } from '../services/payments/payment-report.service';
import type { PaymentGateway } from '../services/payments/payment-gateway.port';
import type { PlatformSettingsService } from '../services/operator/platform-settings.service';
import type { Mailer } from '../services/notifications/mailer.port';
import type { Clock } from '../time/clock';

/**
 * The typed shape of everything registered in the awilix container. Resolving any
 * key off `container.cradle` (or an injected `{ ... }: Cradle` in a constructor) is
 * type-checked against this interface end to end.
 *
 * Lifetimes:
 * - `env`, `logger`, `clock`, `orm`, `eventBus`, `sessionService`, `tokenService`,
 *   `passwordService`, `emailVerification`, `identity`, `mailer` — SINGLETON (shared for the process; the password
 *   service's hashing gate must be process-wide). `identity` is the real GitHub
 *   adapter unless `AUTH_IDENTITY_ADAPTER=mock` and `INTEGRATION_TEST_RUN=1`;
 *   `mailer` is Resend unless a log mailer is selected (`container.ts`, `mailerChoice`).
 * - `em`, `userService`, `invitationService`, `mentorProfileService`, `rateLimiter` — SCOPED (created fresh per request scope).
 * - `session` — SCOPED and lazy, registered only by `withRequestScope` /
 *   `withSessionCookieScope`: the caller's live `Session`, or `null` when signed out.
 *   A promise, because resolving it verifies the cookie and loads the user; awilix
 *   caches it, so the whole scope shares one lookup.
 *   `userService` takes it as a constructor dependency but reads it only inside
 *   `list`, so resolving the service in a plain `withScope` still works.
 *
 * As services grow to ~9 concepts, each new one is a new explicit line here and in
 * `container.ts` — never auto-discovered from a folder scan.
 */
export interface Cradle {
  env: AppEnv;
  logger: Logger;
  clock: Clock;
  orm: MikroORM;
  eventBus: EventBus;
  sessionService: SessionService;
  tokenService: TokenService;
  passwordService: PasswordService;
  emailVerification: EmailVerificationService;
  identity: GithubIdentityPort;
  mailer: Mailer;
  em: EntityManager;
  userService: UserService;
  invitationService: InvitationService;
  mentorProfileService: MentorProfileService;
  slotService: SlotService;
  bookingService: BookingService;
  paymentService: PaymentService;
  paymentReportService: PaymentReportService;
  paymentGateway: PaymentGateway;
  platformSettingsService: PlatformSettingsService;
  rateLimiter: RateLimiter;
  session: Promise<Session | null>;
}
