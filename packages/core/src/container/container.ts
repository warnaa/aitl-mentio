import {
  asClass,
  asFunction,
  asValue,
  createContainer,
  InjectionMode,
  type AwilixContainer,
} from 'awilix';
import { getOrm } from '@devmentor/db';
import { getEnv, type AppEnv } from '../config/env';
import { loadSession } from '../http/auth';
import { createLogger } from '../logger';
import { EventBus } from '../events/event-bus';
import { readSessionCookie, SessionService } from '../services/auth/session.service';
import { TokenService } from '../services/auth/token.service';
import { UserService } from '../services/auth/user.service';
import { systemClock } from '../time/clock';
import type { Cradle } from './cradle';

/**
 * The root container is cached on `globalThis` so Next.js HMR reuses a single
 * container (and the single ORM/pool it holds) across dev reloads. Registrations are
 * explicit — no `loadModules` globbing — so every binding is greppable.
 */
const globalForContainer = globalThis as unknown as {
  __devmentorContainer?: Promise<AwilixContainer<Cradle>>;
};

/**
 * Configuration production cannot serve without. Checked when the container is first
 * created — never in the zod schema — because `next build` also runs as production,
 * with no secrets in CI, and reaches `getEnv()`; the container only exists at request
 * time. Development and the build are unaffected (primitives spec B6, E01 edge case 1b).
 */
function assertProductionConfig(env: AppEnv): void {
  if (env.NODE_ENV === 'production' && !env.SESSION_SECRET) {
    throw new Error(
      'SESSION_SECRET is required when NODE_ENV=production (at least 32 characters; generate one with `openssl rand -base64 32`).',
    );
  }
}

async function build(): Promise<AwilixContainer<Cradle>> {
  const env = getEnv();
  assertProductionConfig(env);

  // Resolve the ORM once up front so it can be registered as a shared singleton value.
  const orm = await getOrm();

  const container = createContainer<Cradle>({
    injectionMode: InjectionMode.PROXY,
    strict: true,
  });

  container.register({
    env: asValue(env),
    logger: asFunction(createLogger).singleton(),
    clock: asValue(systemClock),
    orm: asValue(orm),
    eventBus: asClass(EventBus).singleton(),
    // Stateless signers over `env` + `clock`; a missing secret surfaces per call as a 503.
    sessionService: asClass(SessionService).singleton(),
    tokenService: asClass(TokenService).singleton(),
    // A forked EntityManager per scope gives each request its own identity map / UoW.
    em: asFunction(({ orm }: Cradle) => orm.em.fork()).scoped(),
    userService: asClass(UserService).scoped(),
  });

  // Default in-process subscribers. Concept side effects (send a message, invalidate
  // a cache) register here; for now we just log so the event path is observable.
  container.cradle.eventBus.on('auth.user.created', ({ userId }) => {
    container.cradle.logger.info({ userId }, 'auth.user.created');
  });

  return container;
}

/**
 * The process-wide container, built once. A build that *fails* is not cached: a
 * database that is down at the first request (`getOrm` rejects) must not poison every
 * later request until a restart. Concurrent callers share one in-flight build; after
 * a rejection the next call builds again — and a production missing-secret failure
 * keeps failing loudly on every request rather than once.
 */
export function getContainer(): Promise<AwilixContainer<Cradle>> {
  if (!globalForContainer.__devmentorContainer) {
    const pending = build();
    globalForContainer.__devmentorContainer = pending;
    pending.catch(() => {
      if (globalForContainer.__devmentorContainer === pending) {
        delete globalForContainer.__devmentorContainer;
      }
    });
  }
  return globalForContainer.__devmentorContainer;
}

async function runInScope<T>(
  fn: (cradle: Cradle) => Promise<T> | T,
  setup?: (scope: AwilixContainer<Cradle>) => void,
): Promise<T> {
  const container = await getContainer();
  const scope = container.createScope<Cradle>();
  try {
    setup?.(scope);
    return await fn(scope.cradle);
  } finally {
    await scope.dispose();
  }
}

/**
 * Run `fn` inside a fresh awilix scope. The scope owns a forked EntityManager and any
 * other SCOPED services; it is disposed (releasing scoped state) when `fn` settles.
 * This is the entry point for unauthenticated and system work. It registers no
 * `session`: resolving one here is an awilix resolution error, never a silent 401 —
 * code acting for a request uses `withRequestScope`.
 */
export function withScope<T>(fn: (cradle: Cradle) => Promise<T> | T): Promise<T> {
  return runInScope(fn);
}

/**
 * `withScope` for work done on behalf of a request whose session-cookie *value* is
 * already known — the app's page helper, which reads it with `cookies()` and has no
 * `Request`. Registers the scoped, lazily-resolved `session` (see `withRequestScope`).
 */
export function withSessionCookieScope<T>(
  sessionToken: string | null | undefined,
  fn: (cradle: Cradle) => Promise<T> | T,
): Promise<T> {
  return runInScope(fn, (scope) => {
    scope.register({
      // Scoped, so `requireSession` and every service in this scope share one
      // verification and one `findOne(User)`. Resolved lazily: a scope that never asks
      // for the session never touches the database for it.
      session: asFunction((cradle: Cradle) => {
        const session = loadSession(sessionToken, cradle);
        // The cached promise may be resolved by a constructor and never awaited; a
        // rejection still reaches every awaiter, but must not crash the process.
        session.catch(() => undefined);
        return session;
      }).scoped(),
    });
  });
}

/**
 * `withScope` for a route handler: the scope's `session` is resolved from `req`'s
 * `devmentor_session` cookie, on first use, to `Session | null`. A public route that
 * resolves it gets `null` — failing closed is the caller's explicit decision, via
 * `requireSession(req, cradle)`.
 */
export function withRequestScope<T>(
  req: Request,
  fn: (cradle: Cradle) => Promise<T> | T,
): Promise<T> {
  return withSessionCookieScope(readSessionCookie(req.headers.get('cookie')), fn);
}
