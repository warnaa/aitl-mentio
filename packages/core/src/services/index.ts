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
} from './auth/user.service';
export {
  SessionService,
  readSessionCookie,
  SESSION_COOKIE_NAME,
  SESSION_TTL_SECONDS,
  type IssuedSession,
  type SessionClaims,
} from './auth/session.service';
export { TokenService, type PurposeTokenInput } from './auth/token.service';
export {
  GithubEmailUnverifiedError,
  GITHUB_CALLBACK_PATH,
  githubCallbackUrl,
  type AuthorizeUrlInput,
  type GithubIdentity,
  type GithubIdentityPort,
} from './auth/github-identity.port';
