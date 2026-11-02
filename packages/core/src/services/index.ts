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
  clearSessionCookie,
  SESSION_COOKIE_NAME,
  SESSION_TTL_SECONDS,
  type IssuedSession,
  type SessionClaims,
} from './auth/session.service';
export { TokenService, type PurposeTokenInput } from './auth/token.service';
export {
  GithubEmailUnverifiedError,
  GITHUB_CALLBACK_PATH,
  GITHUB_LOGIN_PATTERN,
  githubCallbackUrl,
  githubLoginHint,
  type AuthorizeUrlInput,
  type GithubIdentity,
  type GithubIdentityPort,
} from './auth/github-identity.port';
export {
  OAUTH_STATE_COOKIE_NAME,
  OAUTH_STATE_COOKIE_PATH,
  OAUTH_STATE_PURPOSE,
  OAUTH_STATE_TTL_SECONDS,
  oauthStateCookie,
  clearOAuthStateCookie,
  readOAuthStateCookie,
} from './auth/oauth-state';
export { homeFor, ROLE_HOMES } from './auth/roles';
