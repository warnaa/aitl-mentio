import { asValue } from 'awilix';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Clock } from '../time/clock';

const state = vi.hoisted(() => {
  const logger = { info: vi.fn(), error: vi.fn(), warn: vi.fn() };
  const fork = vi.fn(() => ({ forked: true }));
  return {
    logger,
    fork,
    env: {} as { NODE_ENV: string; SESSION_SECRET?: string },
    getOrm: vi.fn(async () => ({ em: { fork } })),
  };
});

// A factory mock keeps the MikroORM graph out of this unit test entirely.
vi.mock('@devmentor/db', () => ({ getOrm: state.getOrm, User: class User {} }));
vi.mock('../config/env', () => ({ getEnv: () => state.env }));
vi.mock('../logger', () => ({ createLogger: () => state.logger }));

const { getContainer, withScope } = await import('./container');
const { systemClock } = await import('../time/clock');
const { UserService } = await import('../services/auth/user.service');
const { EventBus } = await import('../events/event-bus');

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

  it('builds once and caches the container on globalThis', async () => {
    const first = await getContainer();
    const second = await getContainer();

    expect(second).toBe(first);
    expect(state.getOrm).toHaveBeenCalledTimes(1);
  });

  it('logs auth.user.created through the default subscriber', async () => {
    const container = await getContainer();

    await container.cradle.eventBus.emit('auth.user.created', {
      userId: 'u1',
      email: 'ada@example.com',
    } as never);

    expect(state.logger.info).toHaveBeenCalledWith({ userId: 'u1' }, 'auth.user.created');
  });
});

describe('production configuration check', () => {
  const secret = 'x'.repeat(32);

  it('refuses to build in production without SESSION_SECRET, before touching the database', async () => {
    state.env = { NODE_ENV: 'production' };

    await expect(getContainer()).rejects.toThrow(/SESSION_SECRET is required when NODE_ENV=production/);
    expect(state.getOrm).not.toHaveBeenCalled();
  });

  it('builds in production once SESSION_SECRET is set', async () => {
    state.env = { NODE_ENV: 'production', SESSION_SECRET: secret };

    const container = await getContainer();

    expect(container.cradle.env).toBe(state.env);
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
      clock: cradle.clock,
    }));

    expect(result.em).toEqual({ forked: true });
    expect(result.userService).toBeInstanceOf(UserService);
    expect(result.clock).toBe(systemClock);
    expect(state.fork).toHaveBeenCalledTimes(1);
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
