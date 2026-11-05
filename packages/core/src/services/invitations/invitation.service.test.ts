import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { InvitationServiceDeps } from './invitation.service';

const db = vi.hoisted(() => {
  class User {}
  class Invitation {}
  class MentorProfile {}
  class UniqueConstraintViolationException extends Error {
    constructor(readonly constraint?: string) {
      super('duplicate');
    }
  }
  return {
    User,
    Invitation,
    MentorProfile,
    LockMode: { PESSIMISTIC_WRITE: 'write' },
    UniqueConstraintViolationException,
  };
});
vi.mock('@devmentor/db', () => db);
const { InvitationService, INVALID_INVITATION } = await import('./invitation.service');
const NOW = new Date('2026-11-04T12:00:00Z');
const FUTURE = new Date('2026-11-18T12:00:00Z');

function fixture() {
  const user = {
    id: 'user-1',
    email: 'engineer@example.com',
    roles: ['mentee'],
    emailVerifiedAt: NOW as Date | null,
    sessionVersion: 0,
  };
  const invitation = {
    id: 'invitation-1',
    email: 'engineer@example.com',
    stackTags: ['react'],
    tokenHash: 'hash',
    expiresAt: FUTURE,
    acceptedAt: null as Date | null,
    acceptedBy: null as unknown,
    publishDueAt: null as Date | null,
    revokedAt: null as Date | null,
  };
  const state = {
    user: user as typeof user | null,
    invitation: invitation as typeof invitation | null,
    profile: null as { id: string; initialPublishDueAt: Date | null } | null,
    created: [] as unknown[],
  };
  const em = {
    findOne: vi.fn(async (...[entity]: [entity: unknown, where?: unknown, options?: unknown]) =>
      entity === db.User ? state.user : entity === db.Invitation ? state.invitation : state.profile,
    ),
    create: vi.fn((entity: unknown, input: object) => {
      const row = { id: 'created-1', ...input };
      state.created.push(row);
      return row;
    }),
    persist: vi.fn(),
    flush: vi.fn(async () => undefined),
    nativeUpdate: vi.fn(async (_entity: unknown, _where: unknown, data: object) => {
      Object.assign(user, data);
      return 1;
    }),
    refresh: vi.fn(async () => undefined),
    transactional: vi.fn(),
  };
  em.transactional.mockImplementation(async (fn: (manager: typeof em) => unknown) => fn(em));
  const deps = {
    em,
    session: Promise.resolve({ userId: user.id, roles: ['mentee'] }),
    env: {
      APP_URL: 'https://devmentor.example',
      INVITATION_TTL_DAYS: 14,
      MENTOR_PUBLISH_WINDOW_DAYS: 14,
      OPERATOR_EMAILS: [],
    },
    tokenService: {
      mintOpaqueToken: vi.fn(() => ({ token: 'secret', hash: 'hashed-secret' })),
      hashToken: vi.fn(() => 'hash'),
    },
    clock: { now: () => NOW },
    logger: { info: vi.fn(), error: vi.fn() },
    eventBus: { emit: vi.fn<(event: string, payload: unknown) => Promise<undefined>>(async () => undefined) },
  };
  return {
    state,
    user,
    invitation,
    em,
    deps,
    service: new InvitationService(deps as unknown as InvitationServiceDeps),
  };
}
let f: ReturnType<typeof fixture>;
beforeEach(() => {
  f = fixture();
});

describe('InvitationService create', () => {
  it('normalizes the email, de-duplicates tags and snapshots expiry without persisting a token', async () => {
    f.state.user = null;
    f.state.invitation = null;
    expect(
      await f.service.create({
        email: ' Engineer@Example.com ',
        stackTags: ['react', 'react'],
        batch: ' first ',
      }),
    ).toEqual({ id: 'created-1', link: 'https://devmentor.example/invitation/secret' });
    expect(f.em.create).toHaveBeenCalledWith(
      db.Invitation,
      expect.objectContaining({
        email: 'engineer@example.com',
        stackTags: ['react'],
        tokenHash: 'hashed-secret',
        expiresAt: FUTURE,
        batch: 'first',
      }),
    );
    expect(f.state.created[0]).not.toHaveProperty('token');
  });
  it('permits an existing non-mentor account and optional batch', async () => {
    f.state.invitation = null;
    await f.service.create({ email: f.user.email, stackTags: [] });
    expect(f.em.findOne.mock.calls[0]).toEqual([
      db.User,
      { email: { $ilike: f.user.email } },
      { lockMode: 'write', refresh: true },
    ]);
  });
  it.each([
    { email: 'bad', stackTags: [] },
    { email: 'a@example.com', stackTags: ['unsupported'] },
    { email: 'a@example.com', stackTags: ['react'], batch: '' },
  ])('rejects invalid input before touching persistence', async (input) => {
    await expect(f.service.create(input)).rejects.toMatchObject({ status: 422 });
    expect(f.em.transactional).not.toHaveBeenCalled();
  });
  it('refuses existing mentors and unresolved invitations, including expired ones', async () => {
    f.user.roles.push('mentor');
    await expect(f.service.create({ email: f.user.email, stackTags: [] })).rejects.toMatchObject({
      status: 409,
    });
    f.user.roles = ['mentee'];
    f.invitation.expiresAt = new Date(0);
    await expect(f.service.create({ email: f.user.email, stackTags: [] })).rejects.toMatchObject({
      status: 409,
    });
  });
  it('maps only the named pending-email uniqueness race to a conflict', async () => {
    f.em.transactional.mockRejectedValue(
      new db.UniqueConstraintViolationException('invitations_unresolved_email_unique'),
    );
    await expect(f.service.create({ email: f.user.email, stackTags: [] })).rejects.toMatchObject({
      status: 409,
    });
    for (const error of [
      new db.UniqueConstraintViolationException('invitations_token_hash_unique'),
      new db.UniqueConstraintViolationException(),
      new Error('database unavailable'),
    ]) {
      f.em.transactional.mockRejectedValue(error);
      await expect(f.service.create({ email: f.user.email, stackTags: [] })).rejects.toBe(error);
    }
  });
});

describe('lookup and accept', () => {
  it('exposes only invitation display fields after the token was presented', async () => {
    expect(await f.service.lookup('secret')).toEqual({
      email: f.user.email,
      stackTags: ['react'],
      expiresAt: FUTURE.toISOString(),
    });
    expect(f.deps.tokenService.hashToken).toHaveBeenCalledWith('secret');
  });
  it.each(['unknown', 'accepted', 'revoked', 'expired', 'at-expiry'])(
    'uses the identical invalid answer for %s',
    async (state) => {
      if (state === 'unknown') f.state.invitation = null;
      if (state === 'accepted') f.invitation.acceptedAt = NOW;
      if (state === 'revoked') f.invitation.revokedAt = NOW;
      if (state === 'expired') f.invitation.expiresAt = new Date(0);
      if (state === 'at-expiry') f.invitation.expiresAt = NOW;
      await expect(f.service.lookup('secret')).rejects.toMatchObject({
        status: 404,
        message: INVALID_INVITATION,
      });
      await expect(f.service.accept('secret')).rejects.toMatchObject({
        status: 404,
        message: INVALID_INVITATION,
      });
      expect(f.em.nativeUpdate).not.toHaveBeenCalled();
    },
  );
  it('requires a session and a persisted user', async () => {
    f.deps.session = Promise.resolve(null) as never;
    await expect(f.service.accept('secret')).rejects.toMatchObject({ status: 401 });
    f.deps.session = Promise.resolve({ userId: f.user.id, roles: ['mentee'] });
    f.state.user = null;
    await expect(f.service.accept('secret')).rejects.toMatchObject({ status: 401 });
  });
  it.each(['mismatch', 'unverified'])(
    'refuses %s with no role/profile/consumption/session effects',
    async (kind) => {
      if (kind === 'mismatch') f.user.email = 'someone-else@example.com';
      else f.user.emailVerifiedAt = null;
      await expect(f.service.accept('secret')).rejects.toMatchObject({ status: 403 });
      expect(f.em.nativeUpdate).not.toHaveBeenCalled();
      expect(f.em.create).not.toHaveBeenCalled();
      expect(f.invitation.acceptedAt).toBeNull();
      expect(f.deps.eventBus.emit).not.toHaveBeenCalled();
    },
  );
  it('locks user before invitation/profile, grants additively, creates a profile and emits after commit', async () => {
    f.user.email = ' Engineer@Example.com ';
    let committed = false;
    f.em.transactional.mockImplementation(async (fn) => {
      const value = await fn(f.em);
      committed = true;
      return value;
    });
    f.deps.eventBus.emit.mockImplementation(async () => {
      expect(committed).toBe(true);
    });
    expect(await f.service.accept('secret')).toEqual({
      invitationId: 'invitation-1',
      userId: 'user-1',
      roles: ['mentee', 'mentor'],
      sessionVersion: 1,
      publishDueAt: FUTURE.toISOString(),
    });
    expect(f.em.findOne.mock.calls.filter((call) => call.length === 3).map((call) => call[0])).toEqual([
      db.User,
      db.Invitation,
      db.MentorProfile,
    ]);
    expect(f.em.create).toHaveBeenCalledWith(db.MentorProfile, {
      user: f.user,
      headline: '',
      initialPublishDueAt: FUTURE,
    });
    expect(f.invitation.acceptedBy).toBe(f.user);
    expect(f.invitation.acceptedAt).toBe(NOW);
    expect(f.deps.eventBus.emit.mock.calls.map((call) => call[0])).toEqual([
      'auth.user.roles_changed',
      'invitations.invitation.accepted',
    ]);
  });
  it('keeps an existing mentor role and original deadline, without a duplicate profile or version bump', async () => {
    f.user.roles.push('mentor');
    f.state.profile = { id: 'profile', initialPublishDueAt: new Date('2026-01-01Z') };
    const original = f.state.profile.initialPublishDueAt;
    const result = await f.service.accept('secret');
    expect(result.sessionVersion).toBe(0);
    expect(f.state.profile.initialPublishDueAt).toBe(original);
    expect(f.em.create).not.toHaveBeenCalled();
    expect(f.em.nativeUpdate).not.toHaveBeenCalled();
    expect(f.deps.eventBus.emit).toHaveBeenCalledTimes(1);
  });
  it('fills only an absent deadline on an existing profile', async () => {
    f.state.profile = { id: 'profile', initialPublishDueAt: null };
    await f.service.accept('secret');
    expect(f.state.profile.initialPublishDueAt).toEqual(FUTURE);
    expect(f.em.create).not.toHaveBeenCalled();
  });
  it('binds role writes to the callback manager and drops buffered events on rollback', async () => {
    const nativeUpdate = vi.fn(async (_entity: unknown, _where: unknown, data: object) => {
      Object.assign(f.user, data);
      return 1;
    });
    const transactionManager = {
      ...f.em,
      nativeUpdate,
      flush: vi.fn(async () => {
        throw new Error('rollback');
      }),
    };
    f.em.transactional.mockImplementation(async (fn) => fn(transactionManager));
    await expect(f.service.accept('secret')).rejects.toThrow('rollback');
    expect(nativeUpdate).toHaveBeenCalledOnce();
    expect(f.em.nativeUpdate).not.toHaveBeenCalled();
    expect(f.deps.eventBus.emit).not.toHaveBeenCalled();
  });
});

describe('pending operator transitions and onboarding', () => {
  it('revokes a pending invitation and prevents its reuse', async () => {
    expect(await f.service.revoke(f.invitation.id)).toEqual({ id: f.invitation.id });
    expect(f.invitation.revokedAt).toBe(NOW);
    await expect(f.service.lookup('secret')).rejects.toMatchObject({ status: 404 });
  });
  it('resends even an expired pending invitation, rotating only its secret and expiry', async () => {
    f.invitation.expiresAt = new Date(0);
    expect(await f.service.resend(f.invitation.id)).toEqual({
      id: f.invitation.id,
      link: 'https://devmentor.example/invitation/secret',
    });
    expect(f.invitation.tokenHash).toBe('hashed-secret');
    expect(f.invitation.expiresAt).toEqual(FUTURE);
  });
  it.each(['missing', 'accepted', 'revoked'])('refuses revoke and resend for %s', async (state) => {
    if (state === 'missing') f.state.invitation = null;
    if (state === 'accepted') f.invitation.acceptedAt = NOW;
    if (state === 'revoked') f.invitation.revokedAt = NOW;
    for (const action of ['revoke', 'resend'] as const)
      await expect(f.service[action]('id')).rejects.toMatchObject({
        status: state === 'missing' ? 404 : 409,
      });
  });
  it('enforces mentor authority for onboarding independently of its route', async () => {
    f.deps.session = Promise.resolve(null) as never;
    await expect(f.service.onboarding()).rejects.toMatchObject({ status: 401 });
    f.deps.session = Promise.resolve({ userId: f.user.id, roles: ['mentee'] });
    await expect(f.service.onboarding()).rejects.toMatchObject({ status: 403 });
    f.deps.session = Promise.resolve({ userId: f.user.id, roles: ['mentor'] });
    expect(await f.service.onboarding()).toEqual({ initialPublishDueAt: null });
    f.state.profile = { id: 'profile', initialPublishDueAt: null };
    expect(await f.service.onboarding()).toEqual({ initialPublishDueAt: null });
    f.state.profile.initialPublishDueAt = FUTURE;
    expect(await f.service.onboarding()).toEqual({ initialPublishDueAt: FUTURE.toISOString() });
  });
});
