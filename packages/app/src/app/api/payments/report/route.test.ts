import { expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ get: vi.fn(), session: Promise.resolve(null) as Promise<unknown> }));
vi.mock('@devmentor/core', async original => ({ ...await original<typeof import('@devmentor/core')>(), withRequestScope: async (_req: Request, fn: (c: unknown) => unknown) => fn({ session: state.session, paymentReportService: state }) }));
import { GET, dynamic } from './route';
it('exposes a dynamic aggregate only to a live operator', async () => {
  expect(dynamic).toBe('force-dynamic'); const req = new Request('http://test/api/payments/report');
  expect((await GET(req, undefined as never)).status).toBe(401);
  state.session = Promise.resolve({ userId: 'mentee', roles: ['mentee'] }); expect((await GET(req, undefined as never)).status).toBe(403);
  expect(state.get).not.toHaveBeenCalled();
  state.session = Promise.resolve({ userId: 'operator', roles: ['operator'] }); state.get.mockResolvedValue({ paidSessionCount: 2 });
  const result = await GET(req, undefined as never); expect(result.status).toBe(200); expect(await result.json()).toEqual({ ok: true, data: { paidSessionCount: 2 } });
});
