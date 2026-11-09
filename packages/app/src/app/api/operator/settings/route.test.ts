import { ConflictError, ValidationError } from '@devmentor/core';
import { beforeEach, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  session: Promise.resolve(null) as Promise<unknown>,
  getForOperator: vi.fn(),
  update: vi.fn(),
  listOutOfBounds: vi.fn(),
}));
vi.mock('@devmentor/core', async original => ({
  ...await original<typeof import('@devmentor/core')>(),
  withRequestScope: async (_req: Request, fn: (c: unknown) => unknown) => fn({
    session: state.session,
    platformSettingsService: { getForOperator: state.getForOperator, update: state.update },
    mentorProfileService: { listOutOfBounds: state.listOutOfBounds },
  }),
}));
import { dynamic, GET, PUT } from './route';

const settings = { currency: 'PLN', priceBounds: { p25: { minCents: 8000, maxCents: 60000 }, p50: { minCents: 16000, maxCents: 120000 } }, feePercent: 20, version: 0, updatedAt: null, updatedBy: null };
const outOfBounds = { total: 1, mentors: [{ mentorProfileId: 'p', displayName: 'Ada', slug: 'ada', published: true, price25Cents: 7000, price50Cents: 16000, breaches: ['price25'] }] };
const body = { price25Min: '80', price25Max: '600', price50Min: '160', price50Max: '1200', feePercent: 20, version: 0 };
const get = () => GET(new Request('http://test/api/operator/settings'), undefined as never);
const put = (headers: Record<string, string> = { 'x-devmentor-request': '1' }) => PUT(new Request('http://test/api/operator/settings', { method: 'PUT', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) }), undefined as never);

beforeEach(() => {
  vi.clearAllMocks();
  state.session = Promise.resolve(null);
  state.getForOperator.mockResolvedValue(settings);
  state.update.mockResolvedValue({ ...settings, version: 1 });
  state.listOutOfBounds.mockResolvedValue(outOfBounds);
});

it('refuses signed-out visitors and non-operators before reading or writing anything', async () => {
  expect(dynamic).toBe('force-dynamic');
  expect((await get()).status).toBe(401);
  expect((await put()).status).toBe(401);
  for (const roles of [['mentee'], ['mentor']]) {
    state.session = Promise.resolve({ userId: 'u', roles });
    expect((await get()).status).toBe(403);
    expect((await put()).status).toBe(403);
  }
  expect(state.getForOperator).not.toHaveBeenCalled();
  expect(state.update).not.toHaveBeenCalled();
});

it('gives the operator the settings with the flagged mentors', async () => {
  state.session = Promise.resolve({ userId: 'op', roles: ['operator'] });
  const response = await get();
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ ok: true, data: { settings, outOfBounds } });
  expect(state.listOutOfBounds).toHaveBeenCalledWith(settings);
});

it('saves the raw body through the service and lists mentors against the saved bounds', async () => {
  state.session = Promise.resolve({ userId: 'op', roles: ['operator'] });
  const response = await put();
  expect(response.status).toBe(200);
  expect(state.update).toHaveBeenCalledWith(body);
  expect(state.listOutOfBounds).toHaveBeenCalledWith({ ...settings, version: 1 });
  expect(await response.json()).toEqual({ ok: true, data: { settings: { ...settings, version: 1 }, outOfBounds } });
});

it('requires the CSRF header on a save', async () => {
  state.session = Promise.resolve({ userId: 'op', roles: ['operator'] });
  expect((await put({})).status).toBe(403);
  expect(state.update).not.toHaveBeenCalled();
});

it('maps refused and stale saves to 422 and 409', async () => {
  state.session = Promise.resolve({ userId: 'op', roles: ['operator'] });
  state.update.mockRejectedValueOnce(new ValidationError('Validation failed', { feePercent: ['Enter a fee from 0 to 100%.'] }));
  const refused = await put();
  expect(refused.status).toBe(422);
  expect(await refused.json()).toMatchObject({ ok: false, error: { fieldErrors: { feePercent: ['Enter a fee from 0 to 100%.'] } } });
  state.update.mockRejectedValueOnce(new ConflictError('Settings changed since you opened them. Reload to see the current values.'));
  expect((await put()).status).toBe(409);
  expect(state.listOutOfBounds).not.toHaveBeenCalled();
});
