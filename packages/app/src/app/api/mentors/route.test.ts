import { beforeEach, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ listPublished: vi.fn() }));
vi.mock('../../../../../core/src/container/container', () => ({ withRequestScope: async (_req: Request, fn: (c: unknown) => unknown) => fn({ mentorProfileService: state }) }));
import { GET, dynamic } from './route';

const call = (query = '') => GET(new Request(`http://test/api/mentors${query}`), undefined as never);
beforeEach(() => state.listPublished.mockReset().mockResolvedValue([{ slug: 'ada' }]));

it('serves the public list, optionally narrowed to one known stack tag', async () => {
  expect(dynamic).toBe('force-dynamic');
  const all = await call();
  expect(all.status).toBe(200);
  expect(await all.json()).toEqual({ ok: true, data: { mentors: [{ slug: 'ada' }] } });
  expect(state.listPublished).toHaveBeenLastCalledWith(undefined);
  expect((await call('?tag=ai-agents&q=ignored')).status).toBe(200);
  expect(state.listPublished).toHaveBeenLastCalledWith('ai-agents');
});

it('rejects an unknown or empty tag with 422 instead of an empty list', async () => {
  for (const query of ['?tag=rust', '?tag=']) {
    const response = await call(query);
    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({ ok: false, error: { code: 'validation_failed', fieldErrors: { tag: expect.any(Array) } } });
  }
  expect(state.listPublished).not.toHaveBeenCalled();
});
