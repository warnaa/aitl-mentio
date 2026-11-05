import { beforeEach, describe, expect, it, vi } from 'vitest';
const { cradle } = vi.hoisted(() => ({
  cradle: {
    session: Promise.resolve<{ userId: string; roles: ('mentee' | 'mentor')[] } | null>({
      userId: 'u',
      roles: ['mentee'],
    }),
    invitationService: { lookup: vi.fn(), accept: vi.fn(), onboarding: vi.fn() },
    sessionService: { issue: vi.fn() },
  },
}));
vi.mock('@devmentor/core', async (original) => ({
  ...(await original<typeof import('@devmentor/core')>()),
  withRequestScope: vi.fn(async (_req: Request, fn: (c: typeof cradle) => unknown) => fn(cradle)),
}));
import { ForbiddenError, NotFoundError } from '@devmentor/core';
import { GET, dynamic } from './route';
import { POST } from './accept/route';
import { GET as onboarding, dynamic as onboardingDynamic } from '../../mentors/me/onboarding/route';
const ctx = { params: Promise.resolve({ token: 'opaque' }) };
const req = (method = 'GET', csrf = true) =>
  new Request('http://devmentor.test/api/invitations/opaque', {
    method,
    headers: csrf ? { 'x-devmentor-request': '1' } : {},
  });
beforeEach(() => {
  vi.clearAllMocks();
  cradle.session = Promise.resolve({ userId: 'u', roles: ['mentee'] });
  cradle.sessionService.issue.mockResolvedValue({ cookie: 'fresh-cookie' });
});
describe('invitation routes', () => {
  it('looks up publicly and is dynamic', async () => {
    cradle.invitationService.lookup.mockResolvedValue({ email: 'invited@example.test' });
    expect(dynamic).toBe('force-dynamic');
    expect(await (await GET(req(), ctx)).json()).toEqual({
      ok: true,
      data: { email: 'invited@example.test' },
    });
    expect(cradle.invitationService.lookup).toHaveBeenCalledWith('opaque');
  });
  it.each(['unknown', 'expired', 'revoked', 'consumed'])('maps %s to the same not-found', async () => {
    cradle.invitationService.lookup.mockRejectedValue(new NotFoundError('This invitation is not valid.'));
    const r = await GET(req(), ctx);
    expect(r.status).toBe(404);
    expect(await r.json()).toEqual({
      ok: false,
      error: { code: 'not_found', message: 'This invitation is not valid.' },
    });
  });
  it('reissues a cookie at the committed role version and excludes internal fields', async () => {
    cradle.invitationService.accept.mockResolvedValue({
      userId: 'u',
      sessionVersion: 8,
      roles: ['mentee', 'mentor'],
      publishDueAt: 'due',
    });
    const r = await POST(req('POST'), ctx);
    expect(r.status).toBe(200);
    expect(cradle.sessionService.issue).toHaveBeenCalledExactlyOnceWith({ id: 'u', sessionVersion: 8 });
    expect(r.headers.getSetCookie()).toEqual(['fresh-cookie']);
    expect(await r.json()).toEqual({ ok: true, data: { roles: ['mentee', 'mentor'], publishDueAt: 'due' } });
  });
  it('rejects anonymous acceptance without touching the invitation', async () => {
    cradle.session = Promise.resolve(null);
    const r = await POST(req('POST'), ctx);
    expect(r.status).toBe(401);
    expect(cradle.invitationService.accept).not.toHaveBeenCalled();
    expect(r.headers.getSetCookie()).toEqual([]);
  });
  it('rejects missing CSRF before acceptance', async () => {
    expect((await POST(req('POST', false), ctx)).status).toBe(403);
    expect(cradle.invitationService.accept).not.toHaveBeenCalled();
  });
  it.each([new ForbiddenError(), new NotFoundError('This invitation is not valid.')])(
    'never issues a cookie on acceptance failure',
    async (error) => {
      cradle.invitationService.accept.mockRejectedValue(error);
      const r = await POST(req('POST'), ctx);
      expect(r.status).toBe(error.status);
      expect(cradle.sessionService.issue).not.toHaveBeenCalled();
      expect(r.headers.getSetCookie()).toEqual([]);
    },
  );
  it('requires mentor for durable onboarding read', async () => {
    expect(onboardingDynamic).toBe('force-dynamic');
    expect((await onboarding(req(), ctx)).status).toBe(403);
    expect(cradle.invitationService.onboarding).not.toHaveBeenCalled();
    cradle.session = Promise.resolve({ userId: 'u', roles: ['mentor'] });
    cradle.invitationService.onboarding.mockResolvedValue({ initialPublishDueAt: 'due' });
    expect(await (await onboarding(req(), ctx)).json()).toEqual({
      ok: true,
      data: { initialPublishDueAt: 'due' },
    });
  });
});
