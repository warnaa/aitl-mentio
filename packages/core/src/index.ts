export { getEnv, type AppEnv } from './config/env';
export { createLogger, type Logger } from './logger';
export {
  getContainer,
  configurePaymentGatewayFactory,
  withScope,
  withRequestScope,
  withSessionCookieScope,
  type Cradle,
} from './container/index';
export { systemClock, type Clock } from './time/clock';
export {
  UserService,
  UnverifiedAccountLinkError,
  GithubAccountConflictError,
  EmailNotVerifiedError,
  ASSIGNABLE_ROLES,
  INVALID_CREDENTIALS_MESSAGE,
  type AssignableRole,
  type CreateUserInput,
  type EmailVerification,
  type GithubSignIn,
  type RequestOrigin,
  type UserDto,
  type UserServiceDeps,
} from './services/auth/user.service';
export {
  SessionService,
  readSessionCookie,
  clearSessionCookie,
  SESSION_COOKIE_NAME,
  SESSION_TTL_SECONDS,
  type IssuedSession,
  type SessionClaims,
} from './services/auth/session.service';
export { TokenService, type PurposeTokenInput } from './services/auth/token.service';
export { PasswordService, type PasswordHasher } from './services/auth/password.service';
export {
  EMAIL_VERIFY_PURPOSE,
  EmailVerificationService,
  VERIFY_EMAIL_PATH,
  type VerificationClaims,
} from './services/auth/email-verification.service';
export type { Mailer, MailMessage } from './services/notifications/mailer.port';
export { MAIL_SENT_LOG_MESSAGE } from './services/notifications/adapters/log-mailer';
export {
  GithubEmailUnverifiedError,
  GITHUB_CALLBACK_PATH,
  GITHUB_LOGIN_PATTERN,
  githubCallbackUrl,
  githubLoginHint,
  type AuthorizeUrlInput,
  type GithubIdentity,
  type GithubIdentityPort,
} from './services/auth/github-identity.port';
export {
  OAUTH_STATE_COOKIE_NAME,
  OAUTH_STATE_COOKIE_PATH,
  OAUTH_STATE_PURPOSE,
  OAUTH_STATE_TTL_SECONDS,
  oauthStateCookie,
  clearOAuthStateCookie,
  readOAuthStateCookie,
} from './services/auth/oauth-state';
export { homeFor, ROLE_HOMES } from './services/auth/roles';
export { EventBus, type EventHandler, type EventId, type EventMap } from './events/index';

// Reusable HTTP layer (typed errors, route wrappers, auth guards).
export * from './http/index';

// Convenience re-export so the app can report DB health without importing `db`.
export { checkDbConnection } from '@devmentor/db';

export { InvitationService } from './services/invitations/invitation.service';
export { BookingService, type BookingDto } from './services/bookings/booking.service';
export * from './services/mentors/mentor-profile.service';
export * from './domain/vocabulary';
export * from './domain/vocabularies/stack-tags';
export * from './domain/slug';
export * from './domain/readiness';
export * from './money/money';
export * from './domain/vocabularies/session-lengths';
export * from './http/owned-route';
