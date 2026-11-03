import { asValue } from 'awilix';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Clock } from '../time/clock';

const state = vi.hoisted(() => {
  const logger = { info: vi.fn(), error: vi.fn(), warn: vi.fn() };
  const findOne = vi.fn();
  const fork = vi.fn(() => ({ forked: true, findOne }));
  return {
    logger,
    fork,
    findOne,
    env: {} as {
      NODE_ENV: string;
      SESSION_SECRET?: string;
      OPERATOR_EMAILS?: readonly string[];
      APP_URL?: string;
      AUTH_IDENTITY_ADAPTER?: 'github' | 'mock';
      INTEGRATION_TEST_RUN?: boolean;
      MAILER_ADAPTER?: 'resend' | 'log';
      MAIL_API_KEY?: string;
      MAIL_FROM?: string;
    },
    getOrm: vi.fn(async () => ({ em: { fork } })),
  };
});

// A factory mock keeps the MikroORM graph out of this unit test entirely.
vi.mock('@devmentor/db', () => ({ getOrm: state.getOrm, User: class User {} }));
vi.mock('../config/env', () => ({ getEnv: () => state.env }));
vi.mock('../logger', () => ({ createLogger: () => state.logger }));

const { getContainer, withRequestScope, withScope, withSessionCookieScope } = await import('./container');
const { requireSession } = await import('../http/auth');
const { systemClock } = await import('../time/clock');
const { UserService } = await import('../services/auth/user.service');
const { EventBus } = await import('../events/event-bus');
const { SessionService } = await import('../services/auth/session.service');
const { TokenService } = await import('../services/auth/token.service');
const { PasswordService } = await import('../services/auth/password.service');
const { RateLimiter } = await import('../http/rate-limit');
const { EmailVerificationService } = await import('../services/auth/email-verification.service');
const { LogMailer } = await import('../services/notifications/adapters/log-mailer');
const { ResendMailer } = await import('../services/notifications/adapters/resend-mailer');
const { GithubIdentityAdapter } = await import('../services/auth/adapters/github-identity');
const { MockGithubIdentityAdapter } = await import('../services/auth/adapters/mock-github-identity');

const globalForContainer = globalThis as { __devmentorContainer?: unknown };

beforeEach(() => {
  delete globalForContainer.__devmentorContainer;
  vi.clearAllMocks();
  state.env = { NODE_ENV: 'test' };
});

afterEach(() => {
  delete globalForContainer.__devmentorContainer;
});

describe('getContainer', () => {
  it('registers the shared singletons, including the system clock', async () => {
    const container = await getContainer();

    expect(container.cradle.env).toBe(state.env);
    expect(container.cradle.logger).toBe(state.logger);
    expect(container.cradle.clock).toBe(systemClock);
    expect(container.cradle.eventBus).toBeInstanceOf(EventBus);
  });

  it('registers the session, token and password services as process-wide singletons', async () => {
    const container = await getContainer();
    const scoped = await withScope((cradle) => ({
      sessionService: cradle.sessionService,
      tokenService: cradle.tokenService,
      passwordService: cradle.passwordService,
      emailVerification: cradle.emailVerification,
    }));

    expect(container.cradle.emailVerification).toBeInstanceOf(EmailVerificationService);
    expect(scoped.emailVerification).toBe(container.cradle.emailVerification);

    // One hashing gate per process: a scoped instance would give every request its own.
    expect(container.cradle.passwordService).toBeInstanceOf(PasswordService);
    expect(scoped.passwordService).toBe(container.cradle.passwordService);

    expect(container.cradle.sessionService).toBeInstanceOf(SessionService);
    expect(container.cradle.tokenService).toBeInstanceOf(TokenService);
    expect(scoped.sessionService).toBe(container.cradle.sessionService);
    expect(scoped.tokenService).toBe(container.cradle.tokenService);
  });

  it('builds without SESSION_SECRET; the services fail closed only when used', async () => {
    const container = await getContainer();

    expect(container.cradle.sessionService.clear()).toMatch(/^devmentor_session=;/);
    await expect(container.cradle.sessionService.issue({ id: 'u1', sessionVersion: 0 })).rejects.toMatchObject({
      status: 503,
    });
  });

  it('builds once and caches the container on globalThis', async () => {
    const first = await getContainer();
    const second = await getContainer();

    expect(second).toBe(first);
    expect(state.getOrm).toHaveBeenCalledTimes(1);
  });

  it('shares one in-flight build between concurrent callers', async () => {
    const [first, second] = await Promise.all([getContainer(), getContainer()]);

    expect(second).toBe(first);
    expect(state.getOrm).toHaveBeenCalledTimes(1);
  });

  it('does not cache a failed build: a database down at first request recovers', async () => {
    state.getOrm.mockRejectedValueOnce(new Error('connect ECONNREFUSED'));

    await expect(getContainer()).rejects.toThrow('connect ECONNREFUSED');
    const recovered = await getContainer();

    expect(recovered.cradle.env).toBe(state.env);
    expect(state.getOrm).toHaveBeenCalledTimes(2);
    await expect(getContainer()).resolves.toBe(recovered);
  });

  it('leaves a newer cached build alone when an older failed build settles', async () => {
    let fail!: (error: Error) => void;
    state.getOrm.mockImplementationOnce(
      () => new Promise((_resolve, reject) => (fail = reject)) as never,
    );
    const failing = getContainer();
    await vi.waitFor(() => expect(state.getOrm).toHaveBeenCalledTimes(1));
    delete globalForContainer.__devmentorContainer;
    const replacement = getContainer();

    fail(new Error('connect ECONNREFUSED'));

    await expect(failing).rejects.toThrow('connect ECONNREFUSED');
    expect(globalForContainer.__devmentorContainer).toBe(replacement);
    await expect(replacement).resolves.toBeDefined();
  });

  it('logs auth.user.created through the default subscriber', async () => {
    const container = await getContainer();

    await container.cradle.eventBus.emit('auth.user.created', {
      userId: 'u1',
      email: 'ada@example.com',
    } as never);

    expect(state.logger.info).toHaveBeenCalledWith({ userId: 'u1' }, 'auth.user.created');
  });

  it('logs auth.user.roles_changed through the default subscriber', async () => {
    const container = await getContainer();

    await container.cradle.eventBus.emit('auth.user.roles_changed', {
      userId: 'u1',
      added: ['operator'],
      removed: [],
    });

    expect(state.logger.info).toHaveBeenCalledWith(
      { userId: 'u1', added: ['operator'], removed: [] },
      'auth.user.roles_changed',
    );
  });
});

describe('identity adapter selection', () => {
  const appUrl = 'http://127.0.0.1:41234';

  it('registers the real GitHub adapter by default, as a singleton', async () => {
    state.env = { NODE_ENV: 'test', APP_URL: appUrl, AUTH_IDENTITY_ADAPTER: 'github', INTEGRATION_TEST_RUN: false };
    const container = await getContainer();
    const scoped = await withScope((cradle) => cradle.identity);

    expect(container.cradle.identity).toBeInstanceOf(GithubIdentityAdapter);
    expect(scoped).toBe(container.cradle.identity);
  });

  it('builds the real adapter without GitHub credentials; it fails closed only when used', async () => {
    state.env = { NODE_ENV: 'test', APP_URL: appUrl };
    const container = await getContainer();

    expect(() => container.cradle.identity.authorizeUrl({ state: 's' })).toThrow(
      'GitHub sign-in is not configured.',
    );
  });

  it('registers the mock only when AUTH_IDENTITY_ADAPTER=mock and INTEGRATION_TEST_RUN are both set', async () => {
    state.env = { NODE_ENV: 'production', SESSION_SECRET: 'x'.repeat(32), APP_URL: appUrl, AUTH_IDENTITY_ADAPTER: 'mock', INTEGRATION_TEST_RUN: true, MAILER_ADAPTER: 'log' };
    const container = await getContainer();

    expect(container.cradle.identity).toBeInstanceOf(MockGithubIdentityAdapter);
    expect(container.cradle.identity.authorizeUrl({ state: 's', login: 'mock-mentor' })).toBe(
      `${appUrl}/api/auth/github/callback?code=mock-code.mock-mentor&state=s`,
    );
  });

  it.each([
    ['the run flag alone', { AUTH_IDENTITY_ADAPTER: 'github', INTEGRATION_TEST_RUN: true }],
    ['the adapter switch alone', { AUTH_IDENTITY_ADAPTER: 'mock', INTEGRATION_TEST_RUN: false }],
  ] as const)('keeps the real adapter for %s', async (_name, flags) => {
    state.env = { NODE_ENV: 'test', APP_URL: appUrl, ...flags };
    const container = await getContainer();

    expect(container.cradle.identity).toBeInstanceOf(GithubIdentityAdapter);
  });
});

describe('mailer selection', () => {
  it('logs mail in development when MAILER_ADAPTER is unset, warning once at boot', async () => {
    state.env = { NODE_ENV: 'development' };
    const container = await getContainer();
    const scoped = await withScope((cradle) => cradle.mailer);

    expect(container.cradle.mailer).toBeInstanceOf(LogMailer);
    expect(scoped).toBe(container.cradle.mailer);
    expect(state.logger.warn).toHaveBeenCalledExactlyOnceWith(
      'MAILER_ADAPTER is unset in development: mail is written to this log (msg "mail.sent"), not delivered',
    );
  });

  it('selects the log mailer from MAILER_ADAPTER=log with INTEGRATION_TEST_RUN, without the warning', async () => {
    state.env = { NODE_ENV: 'test', MAILER_ADAPTER: 'log', INTEGRATION_TEST_RUN: true };
    const container = await getContainer();

    expect(container.cradle.mailer).toBeInstanceOf(LogMailer);
    expect(state.logger.warn).not.toHaveBeenCalled();
  });

  it.each([
    ['test with no adapter set', { NODE_ENV: 'test' }],
    ['the log switch without the run flag', { NODE_ENV: 'development', MAILER_ADAPTER: 'log', INTEGRATION_TEST_RUN: false }],
    ['an explicit resend in development', { NODE_ENV: 'development', MAILER_ADAPTER: 'resend' }],
  ] as const)('delivers through Resend for %s', async (_name, env) => {
    state.env = { ...env };
    const container = await getContainer();

    expect(container.cradle.mailer).toBeInstanceOf(ResendMailer);
    expect(state.logger.warn).not.toHaveBeenCalled();
  });
});

describe('production configuration check', () => {
  const secret = 'x'.repeat(32);

  it('refuses to build in production without SESSION_SECRET, before touching the database', async () => {
    state.env = { NODE_ENV: 'production' };

    await expect(getContainer()).rejects.toThrow(/SESSION_SECRET is required when NODE_ENV=production/);
    expect(state.getOrm).not.toHaveBeenCalled();
  });

  it('keeps failing loudly on every request while the secret is missing', async () => {
    state.env = { NODE_ENV: 'production' };

    await expect(getContainer()).rejects.toThrow(/SESSION_SECRET is required/);
    await expect(getContainer()).rejects.toThrow(/SESSION_SECRET is required/);
    await expect(withScope(() => 'served')).rejects.toThrow(/SESSION_SECRET is required/);
  });

  const mail = { MAIL_API_KEY: 're_key', MAIL_FROM: 'DevMentor <no-reply@devmentor.example>' };

  it('builds in production once SESSION_SECRET and the mail configuration are set', async () => {
    state.env = { NODE_ENV: 'production', SESSION_SECRET: secret, ...mail };

    const container = await getContainer();

    expect(container.cradle.env).toBe(state.env);
    expect(container.cradle.mailer).toBeInstanceOf(ResendMailer);
  });

  it.each([
    ['MAIL_API_KEY', { MAIL_FROM: mail.MAIL_FROM }],
    ['MAIL_FROM', { MAIL_API_KEY: mail.MAIL_API_KEY }],
  ])('refuses to build in production without %s, before touching the database (edge case 1b)', async (_missing, partial) => {
    state.env = { NODE_ENV: 'production', SESSION_SECRET: secret, ...partial };

    await expect(getContainer()).rejects.toThrow(/MAIL_API_KEY and MAIL_FROM are required when NODE_ENV=production/);
    expect(state.getOrm).not.toHaveBeenCalled();
  });

  it('builds in production without mail configuration only for the harness log mailer', async () => {
    state.env = { NODE_ENV: 'production', SESSION_SECRET: secret, MAILER_ADAPTER: 'log', INTEGRATION_TEST_RUN: true };

    const container = await getContainer();

    expect(container.cradle.mailer).toBeInstanceOf(LogMailer);
  });

  it.each(['development', 'test'])('builds in %s without SESSION_SECRET', async (nodeEnv) => {
    state.env = { NODE_ENV: nodeEnv };

    const container = await getContainer();

    expect(container.cradle.env).toBe(state.env);
    expect(state.getOrm).toHaveBeenCalledTimes(1);
  });
});

describe('withScope', () => {
  it('gives each scope its own forked EntityManager and scoped services', async () => {
    const result = await withScope((cradle) => ({
      em: cradle.em,
      userService: cradle.userService,
      rateLimiter: cradle.rateLimiter,
      clock: cradle.clock,
    }));
    const other = await withScope((cradle) => cradle.rateLimiter);

    expect(result.em).toMatchObject({ forked: true });
    expect(result.userService).toBeInstanceOf(UserService);
    expect(result.rateLimiter).toBeInstanceOf(RateLimiter);
    expect(other).not.toBe(result.rateLimiter); // counts through its own scope's em
    expect(result.clock).toBe(systemClock);
    expect(state.fork).toHaveBeenCalledTimes(2);
  });

  it('honours a fixed clock registered on the scope', async () => {
    const fixed: Clock = { now: () => new Date('2026-09-04T00:00:00.000Z') };
    const container = await getContainer();
    const scope = container.createScope();
    scope.register({ clock: asValue(fixed) });

    expect(scope.cradle.clock.now().toISOString()).toBe('2026-09-04T00:00:00.000Z');
    expect(container.cradle.clock).toBe(systemClock);
    await scope.dispose();
  });

  it('disposes the scope even when the callback throws', async () => {
    const container = await getContainer();
    const createScope = container.createScope.bind(container);
    const dispose = vi.fn();
    vi.spyOn(container, 'createScope').mockImplementation(() => {
      const scope = createScope();
      const original = scope.dispose.bind(scope);
      scope.dispose = () => {
        dispose();
        return original();
      };
      return scope;
    });

    await expect(
      withScope(() => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
    expect(dispose).toHaveBeenCalledTimes(1);
  });
});

describe('request scopes and the scoped session', () => {
  const secret = 'x'.repeat(32);
  const user = {
    id: 'user-1',
    email: 'grace@devmentor.test',
    emailVerifiedAt: new Date('2026-10-01T00:00:00.000Z'),
    roles: ['mentee'],
    sessionVersion: 0,
  };

  beforeEach(() => {
    state.env = { NODE_ENV: 'test', SESSION_SECRET: secret, OPERATOR_EMAILS: [] };
    state.findOne.mockResolvedValue(user);
  });

  async function cookieToken(): Promise<string> {
    const container = await getContainer();
    const { cookie } = await container.cradle.sessionService.issue(user);
    return cookie.split(';')[0]!.slice('devmentor_session='.length);
  }

  function requestWith(cookie?: string): Request {
    return new Request('http://devmentor.test/api/things', cookie ? { headers: { cookie } } : {});
  }

  it('resolves the session once per scope, shared by requireSession and other resolvers', async () => {
    const token = await cookieToken();
    const req = requestWith(`theme=dark; devmentor_session=${token}`);

    const result = await withRequestScope(req, async (cradle) => {
      const guarded = await requireSession(req, cradle);
      const again = await cradle.session;
      return { guarded, again };
    });

    expect(result.guarded).toEqual({ userId: 'user-1', roles: ['mentee'] });
    expect(result.again).toBe(result.guarded);
    expect(state.findOne).toHaveBeenCalledTimes(1);
  });

  it('resolves afresh in each new scope', async () => {
    const token = await cookieToken();
    const req = requestWith(`devmentor_session=${token}`);

    await withRequestScope(req, (cradle) => cradle.session);
    await withRequestScope(req, (cradle) => cradle.session);

    expect(state.findOne).toHaveBeenCalledTimes(2);
  });

  it('is lazy: a scope that never asks for the session never looks the user up', async () => {
    const token = await cookieToken();

    await withRequestScope(requestWith(`devmentor_session=${token}`), () => 'public');

    expect(state.findOne).not.toHaveBeenCalled();
  });

  it('gives a public route null for a signed-out request, never a throw', async () => {
    const session = await withRequestScope(requestWith(), (cradle) => cradle.session);

    expect(session).toBeNull();
    expect(state.findOne).not.toHaveBeenCalled();
  });

  it('answers 401 through requireSession when the request carries only other cookies', async () => {
    const req = requestWith('theme=dark');

    await expect(withRequestScope(req, (cradle) => requireSession(req, cradle))).rejects.toMatchObject({
      status: 401,
    });
  });

  it('resolves the session from a cookie value for the page helper', async () => {
    const token = await cookieToken();

    const session = await withSessionCookieScope(token, (cradle) => cradle.session);

    expect(session).toEqual({ userId: 'user-1', roles: ['mentee'] });
  });

  it('resolves null from an absent cookie value', async () => {
    await expect(withSessionCookieScope(undefined, (cradle) => cradle.session)).resolves.toBeNull();
  });

  it('does not leak an unhandled rejection when a resolved session is never awaited', async () => {
    const token = await cookieToken();
    state.findOne.mockResolvedValue({ ...user, roles: [] });
    const unhandled = vi.fn();
    process.on('unhandledRejection', unhandled);

    try {
      await withSessionCookieScope(token, (cradle) => {
        void cradle.session;
        return 'rendered';
      });
      await new Promise((resolve) => setTimeout(resolve, 10));
    } finally {
      process.off('unhandledRejection', unhandled);
    }

    expect(unhandled).not.toHaveBeenCalled();
  });

  it('still rejects for a caller that awaits a corrupt session', async () => {
    const token = await cookieToken();
    state.findOne.mockResolvedValue({ ...user, roles: [] });

    await expect(withSessionCookieScope(token, (cradle) => cradle.session)).rejects.toThrow(
      /has no effective role/,
    );
  });

  it('registers no session in a plain withScope', async () => {
    await expect(withScope((cradle) => cradle.session)).rejects.toThrow(/session/);
  });
});
