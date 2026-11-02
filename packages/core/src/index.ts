export { getEnv, type AppEnv } from './config/env';
export { createLogger, type Logger } from './logger';
export {
  getContainer,
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
  ASSIGNABLE_ROLES,
  type AssignableRole,
  type CreateUserInput,
  type GithubSignIn,
  type UserDto,
  type UserServiceDeps,
} from './services/auth/user.service';
export {
  SessionService,
  readSessionCookie,
  SESSION_COOKIE_NAME,
  SESSION_TTL_SECONDS,
  type IssuedSession,
  type SessionClaims,
} from './services/auth/session.service';
export { TokenService, type PurposeTokenInput } from './services/auth/token.service';
export {
  GithubEmailUnverifiedError,
  GITHUB_CALLBACK_PATH,
  githubCallbackUrl,
  type AuthorizeUrlInput,
  type GithubIdentity,
  type GithubIdentityPort,
} from './services/auth/github-identity.port';
export { EventBus, type EventHandler, type EventId, type EventMap } from './events/index';

// Reusable HTTP layer (typed errors, route wrappers, auth guards).
export * from './http/index';

// Convenience re-export so the app can report DB health without importing `db`.
export { checkDbConnection } from '@devmentor/db';
