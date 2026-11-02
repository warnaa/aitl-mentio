export { getEnv, type AppEnv } from './config/env';
export { createLogger, type Logger } from './logger';
export { getContainer, withScope, type Cradle } from './container/index';
export { systemClock, type Clock } from './time/clock';
export { UserService, type UserDto } from './services/auth/user.service';
export {
  SessionService,
  readSessionCookie,
  SESSION_COOKIE_NAME,
  SESSION_TTL_SECONDS,
  type IssuedSession,
  type SessionClaims,
} from './services/auth/session.service';
export { TokenService, type PurposeTokenInput } from './services/auth/token.service';
export { EventBus, type EventHandler, type EventId, type EventMap } from './events/index';
export { userCreateSchema, type UserCreateInput } from './validators/auth/user-create.schema';

// Reusable HTTP layer (typed errors, route wrappers, auth guards).
export * from './http/index';

// Convenience re-export so the app can report DB health without importing `db`.
export { checkDbConnection } from '@devmentor/db';
