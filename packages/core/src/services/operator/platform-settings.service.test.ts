import type { EntityManager } from '@devmentor/db';
import { describe, expect, it, vi } from 'vitest';
import type { Session } from '../../http/auth';
import { ConflictError, ForbiddenError, ServiceUnavailableError, UnauthorizedError, ValidationError } from '../../http/errors';
import { DEFAULT_FEE_PERCENT, PlatformSettingsService } from './platform-settings.service';

const bounds = { p25: { minCents: 8000, maxCents: 60000 }, p50: { minCents: 16000, maxCents: 120000 } };
const now = new Date('2026-11-09T12:00:00.000Z');
const operator: Session = { userId: '00000000-0000-4000-8000-000000000001', roles: ['operator'] } as Session;
const mentor: Session = { userId: '00000000-0000-4000-8000-000000000002', roles: ['mentor'] } as Session;
const row = (patch: Record<string, unknown> = {}) => ({
  id: 1, price25MinCents: 10000, price25MaxCents: 50000, price50MinCents: 20000, price50MaxCents: 100000,
  feePercent: 15, currency: 'PLN', version: 2, updatedBy: { displayName: 'Founder A' }, updatedAt: now, ...patch,
});
const form = { price25Min: '100', price25Max: '500', price50Min: '200', price50Max: '1000', feePercent: 25, version: 2 };

function harness(opts: { stored?: ReturnType<typeof row> | null; session?: Session | null; env?: { PLATFORM_CURRENCY?: unknown; PLATFORM_PRICE_BOUNDS?: unknown } } = {}) {
  let stored = opts.stored ?? null;
  const findOne = vi.fn(async () => stored && { ...stored });
  const execute = vi.fn(async (_sql: string, params: unknown[]) => {
    if (!stored) stored = row({ price25MinCents: params[1], price25MaxCents: params[2], price50MinCents: params[3], price50MaxCents: params[4], feePercent: params[5], version: 0, updatedBy: null, updatedAt: params[6] });
  });
  const flush = vi.fn();
  const tx = {
    execute,
    findOneOrFail: vi.fn(async () => {
      const locked = { ...stored! };
      flush.mockImplementation(async () => { stored = { ...locked, updatedBy: { displayName: 'Founder A' } }; });
      return locked;
    }),
    getReference: vi.fn((_entity: unknown, id: string) => ({ id })),
    flush,
  };
  const transactional = vi.fn(async (fn: (em: typeof tx) => Promise<unknown>) => fn(tx));
  const em = { findOne, fork: () => ({ transactional }) } as unknown as EntityManager;
  const logger = { info: vi.fn() };
  const service = new PlatformSettingsService({
    env: opts.env ?? { PLATFORM_CURRENCY: 'PLN', PLATFORM_PRICE_BOUNDS: JSON.stringify(bounds) },
    em,
    session: Promise.resolve(opts.session === undefined ? operator : opts.session),
    clock: { now: () => now },
    logger,
  });
  return { service, findOne, execute, tx, transactional, flush, logger };
}

describe('reading', () => {
  it('serves the env bounds and the 20 % default fee while no row is saved, as before the table existed', async () => {
    const { service } = harness();
    expect(await service.get()).toEqual({ currency: 'PLN', priceBounds: bounds, feePercent: 20 });
    expect(DEFAULT_FEE_PERCENT).toBe(20);
    expect(await service.boundsFor(25)).toEqual(bounds.p25);
    expect(await service.boundsFor(50)).toEqual(bounds.p50);
  });

  it('returns copies, so a caller cannot mutate the shared policy', async () => {
    const { service } = harness();
    (await service.get()).priceBounds.p25.minCents = 1;
    expect((await service.boundsFor(25)).minCents).toBe(8000);
  });

  it('prefers the saved row over the env', async () => {
    const { service } = harness({ stored: row() });
    expect(await service.get()).toEqual({
      currency: 'PLN', feePercent: 15,
      priceBounds: { p25: { minCents: 10000, maxCents: 50000 }, p50: { minCents: 20000, maxCents: 100000 } },
    });
  });

  it('reads the row once per request scope', async () => {
    const { service, findOne } = harness({ stored: row() });
    await service.get();
    await service.boundsFor(50);
    expect(findOne).toHaveBeenCalledTimes(1);
  });

  it('fails closed on absent, malformed, partial, noninteger, inverted, zero or unsupported env settings', async () => {
    for (const value of [undefined, '', 'bad', '{}', 'null', JSON.stringify({ ...bounds, p50: undefined }), JSON.stringify({ ...bounds, p25: { minCents: 0, maxCents: 1 } }), JSON.stringify({ ...bounds, p25: { minCents: 2, maxCents: 1 } }), JSON.stringify({ ...bounds, p25: { minCents: 0.5, maxCents: 1 } }), JSON.stringify({ ...bounds, p25: { minCents: 1, maxCents: 2147483648 } })]) {
      await expect(harness({ env: { PLATFORM_CURRENCY: 'PLN', PLATFORM_PRICE_BOUNDS: value } }).service.get()).rejects.toThrow('Platform price settings are unavailable.');
    }
    for (const currency of [undefined, '', 'USD', 'JPY']) {
      await expect(harness({ env: { PLATFORM_CURRENCY: currency, PLATFORM_PRICE_BOUNDS: JSON.stringify(bounds) } }).service.get()).rejects.toBeInstanceOf(ServiceUnavailableError);
    }
  });

  it('fails closed on a row that breaks the invariants, and retries on the next read', async () => {
    const { service, findOne } = harness({ stored: row({ price25MinCents: 60000 }) });
    await expect(service.get()).rejects.toBeInstanceOf(ServiceUnavailableError);
    await expect(service.get()).rejects.toBeInstanceOf(ServiceUnavailableError);
    expect(findOne).toHaveBeenCalledTimes(2);
  });

  it('shows the operator the version and last editor, and nobody else', async () => {
    expect(await harness({ stored: row() }).service.getForOperator()).toMatchObject({ version: 2, updatedAt: now.toISOString(), updatedBy: { displayName: 'Founder A' } });
    expect(await harness().service.getForOperator()).toMatchObject({ version: 0, updatedAt: null, updatedBy: null, feePercent: 20 });
    // The editor's account was deleted (on delete set null): the values stay, the name does not.
    expect(await harness({ stored: row({ updatedBy: null }) }).service.getForOperator()).toMatchObject({ version: 2, updatedAt: now.toISOString(), updatedBy: null });
    await expect(harness({ session: mentor }).service.getForOperator()).rejects.toBeInstanceOf(ForbiddenError);
    await expect(harness({ session: null }).service.getForOperator()).rejects.toBeInstanceOf(UnauthorizedError);
  });
});

describe('updating', () => {
  it('refuses a signed-out visitor or a non-operator before touching the database', async () => {
    for (const session of [null, mentor]) {
      const { service, transactional } = harness({ session, stored: row() });
      await expect(service.update(form)).rejects.toBeInstanceOf(session ? ForbiddenError : UnauthorizedError);
      expect(transactional).not.toHaveBeenCalled();
    }
  });

  it('refuses invalid input with field errors and changes nothing', async () => {
    const { service, transactional } = harness({ stored: row() });
    await expect(service.update({ ...form, feePercent: 101 })).rejects.toBeInstanceOf(ValidationError);
    await expect(service.update({ ...form, price25Min: '600' })).rejects.toMatchObject({ fieldErrors: { price25Max: [expect.any(String)] } });
    expect(transactional).not.toHaveBeenCalled();
  });

  it('refuses a stale version with 409 and flushes nothing', async () => {
    const { service, flush, logger } = harness({ stored: row({ version: 3 }) });
    await expect(service.update(form)).rejects.toEqual(new ConflictError('Settings changed since you opened them. Reload to see the current values.'));
    expect(flush).not.toHaveBeenCalled();
    expect(logger.info).not.toHaveBeenCalled();
  });

  it('saves under the row lock, bumps the version, records the editor and logs the audit line', async () => {
    const { service, tx, logger } = harness({ stored: row() });
    expect(await service.get()).toMatchObject({ feePercent: 15 });
    const saved = await service.update(form);
    expect(tx.findOneOrFail).toHaveBeenCalledWith(expect.anything(), { id: 1 }, expect.objectContaining({ lockMode: expect.anything(), refresh: true }));
    expect(tx.getReference).toHaveBeenCalledWith(expect.anything(), operator.userId);
    expect(saved).toMatchObject({
      version: 3, feePercent: 25, updatedBy: { displayName: 'Founder A' },
      priceBounds: { p25: { minCents: 10000, maxCents: 50000 }, p50: { minCents: 20000, maxCents: 100000 } },
    });
    // The memo is cleared: later reads in the same request see the new policy.
    expect(await service.get()).toMatchObject({ feePercent: 25 });
    expect(logger.info).toHaveBeenCalledWith(expect.objectContaining({ actorId: operator.userId, version: 3, previous: expect.objectContaining({ feePercent: 15, version: 2 }), next: expect.objectContaining({ feePercent: 25 }) }), 'operator.settings.updated');
  });

  it('writes the audit line for a committed save even when the re-read afterwards fails', async () => {
    const { service, findOne, logger } = harness({ stored: row() });
    await service.get();
    findOne.mockRejectedValueOnce(new Error('connection reset'));
    await expect(service.update(form)).rejects.toThrow('connection reset');
    expect(logger.info).toHaveBeenCalledWith(expect.objectContaining({ version: 3, next: expect.objectContaining({ feePercent: 25 }) }), 'operator.settings.updated');
  });

  it('creates the row on the first save from the env defaults, with a conflict-proof insert', async () => {
    const { service, execute } = harness();
    const saved = await service.update({ ...form, version: 0 });
    expect(execute.mock.calls[0]![0]).toMatch(/on conflict \("id"\) do nothing/);
    expect(execute.mock.calls[0]![1]).toEqual([1, 10000, 50000, 20000, 100000, 25, now]);
    expect(saved).toMatchObject({ version: 1, feePercent: 25 });
  });

  it('can repair malformed env settings, because the save does not depend on them', async () => {
    const { service } = harness({ env: { PLATFORM_CURRENCY: 'PLN', PLATFORM_PRICE_BOUNDS: 'bad' } });
    await expect(service.get()).rejects.toBeInstanceOf(ServiceUnavailableError);
    expect(await service.update({ ...form, version: 0 })).toMatchObject({ version: 1 });
    expect(await service.get()).toMatchObject({ feePercent: 25 });
  });
});
