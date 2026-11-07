import { expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ error: vi.fn() }));
vi.mock('../../../../../core/src/logger', () => ({ createLogger: () => state }));
import { noteHandler } from './route-handler';
import { ConflictError } from '@devmentor/core';
const req = new Request('http://test/api/notes/booking');
const ctx = { params: Promise.resolve({ bookingId: 'booking' }) };
it('masks driver errors before logging, while retaining typed conflicts and private no-store envelopes', async () => {
  const privateText = 'private note body must never enter the error log';
  const response = await noteHandler(() => { throw new Error(`Failing row: ${privateText}`); })(req, ctx);
  expect(response.status).toBe(500);
  expect(response.headers.get('cache-control')).toBe('private, no-store');
  expect(await response.text()).not.toContain(privateText);
  expect(state.error).toHaveBeenCalledWith({ err: expect.objectContaining({ message: 'Session note operation failed' }), path: req.url }, 'unhandled route error');
  expect(String(state.error.mock.calls[0]![0].err)).not.toContain(privateText);
  expect((await noteHandler(() => { throw new ConflictError('Refresh the note.'); })(req, ctx)).status).toBe(409);
  const ok = await noteHandler(() => ({ current: null, history: [] }))(req, ctx);
  expect(ok.status).toBe(200);
});
