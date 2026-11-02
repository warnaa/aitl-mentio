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
import { createLogger } from '../logger';
import { EventBus } from '../events/event-bus';
import { SessionService } from '../services/auth/session.service';
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

export function getContainer(): Promise<AwilixContainer<Cradle>> {
  if (!globalForContainer.__devmentorContainer) {
    globalForContainer.__devmentorContainer = build();
  }
  return globalForContainer.__devmentorContainer;
}

/**
 * Run `fn` inside a fresh awilix scope. The scope owns a forked EntityManager and any
 * other SCOPED services; it is disposed (releasing scoped state) when `fn` settles.
 * This is the entry point request handlers should use to touch the domain.
 */
export async function withScope<T>(fn: (cradle: Cradle) => Promise<T> | T): Promise<T> {
  const container = await getContainer();
  const scope = container.createScope<Cradle>();
  try {
    return await fn(scope.cradle);
  } finally {
    await scope.dispose();
  }
}
