import { expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ updatePrices: vi.fn(), session: Promise.resolve({ userId: 'owner', roles: ['mentor'] }) as Promise<unknown> }));
vi.mock('../../../../../../../core/src/container/container', () => ({ withRequestScope: async (_req: Request, fn: (c: unknown) => unknown) => fn({ mentorProfileService: state, session: state.session }) }));
import { PUT, dynamic } from './route';
import { ServiceUnavailableError } from '@devmentor/core';
it('uses the protected JSON schema action and forwards both raw decimals', async () => {
  state.updatePrices.mockResolvedValue({ prices: 'saved' });
  const call = (body: unknown, csrf = true) => PUT(new Request('http://test/api/mentors/me/prices', { method: 'PUT', headers: csrf ? { 'x-devmentor-request': '1' } : {}, body: JSON.stringify(body) }), undefined as never);
  expect(dynamic).toBe('force-dynamic');
  expect((await call({ price25: '80', price50: '160' })).status).toBe(200);
  expect(state.updatePrices).toHaveBeenCalledWith({ price25: '80', price50: '160' });
  expect((await call({ price25: '80' })).status).toBe(422);
  expect((await call({}, false)).status).toBe(403);
  state.updatePrices.mockRejectedValueOnce(new ServiceUnavailableError('Platform price settings are unavailable.'));
  expect((await call({ price25: '80', price50: '160' })).status).toBe(503);
  state.session = Promise.resolve(null); expect((await call({})).status).toBe(401);
  state.session = Promise.resolve({ userId: 'owner', roles: ['mentee'] }); expect((await call({})).status).toBe(403);
});
