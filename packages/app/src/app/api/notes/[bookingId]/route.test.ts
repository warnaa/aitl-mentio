import { beforeEach, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ getForParticipant: vi.fn(), saveDraft: vi.fn(), session: Promise.resolve(null) as Promise<unknown> }));
vi.mock('../../../../../../core/src/container/container', () => ({
  withRequestScope: async (_req: Request, fn: (value: unknown) => unknown) => fn({ sessionNoteService: state, session: state.session }),
}));
import { GET, PUT, dynamic } from './route';
import { ConflictError, ForbiddenError, NotFoundError, TooManyRequestsError, ValidationError } from '@devmentor/core';
const id = '11111111-1111-4111-8111-111111111111';
const ctx = { params: Promise.resolve({ bookingId: id }) };
const call = (method: 'GET' | 'PUT', body = '{"body":"note","expectedRevision":null}', csrf = true) => (method === 'GET' ? GET : PUT)(new Request(`http://test/api/notes/${id}`, { method, headers: csrf ? { 'x-devmentor-request': '1' } : {}, ...(method === 'PUT' ? { body } : {}) }), ctx);
beforeEach(() => {
  vi.clearAllMocks();
  state.session = Promise.resolve({ userId: 'mentor', roles: ['mentor'] });
  state.getForParticipant.mockResolvedValue({ current: null, history: [] });
  state.saveDraft.mockResolvedValue({ body: 'note', version: 1, revision: 1 });
});
it('reads and saves through the authenticated scope with no-store responses', async () => {
  expect(dynamic).toBe('force-dynamic');
  for (const method of ['GET', 'PUT'] as const) {
    const response = await call(method);
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(await response.json()).toMatchObject({ ok: true });
  }
  expect(state.getForParticipant).toHaveBeenCalledWith(id);
  expect(state.saveDraft).toHaveBeenCalledWith(id, { body: 'note', expectedRevision: null });
});
it('protects signed-out/cross-site/bad JSON paths with the same no-store envelope', async () => {
  state.session = Promise.resolve(null);
  expect((await call('GET')).status).toBe(401);
  expect((await call('PUT')).status).toBe(401);
  state.session = Promise.resolve({ userId: 'mentor', roles: [] });
  expect((await call('PUT', '{}', false)).status).toBe(403);
  expect((await call('PUT', '{bad')).status).toBe(400);
  expect(state.saveDraft).not.toHaveBeenCalled();
});
it('maps service refusals and rate limits without leaking private text', async () => {
  for (const error of [new ForbiddenError(), new NotFoundError(), new ConflictError(), new TooManyRequestsError(2), new ValidationError('Invalid', { body: ['invalid'] })]) {
    state.saveDraft.mockRejectedValueOnce(error);
    const response = await call('PUT');
    expect(response.status).toBe(error.status);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(await response.json()).toMatchObject({ ok: false, error: { code: error.code } });
  }
});
