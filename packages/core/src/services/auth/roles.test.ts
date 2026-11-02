import { beforeEach, describe, expect, it, vi } from 'vitest';

const UserEntity = vi.hoisted(() => class User {});
vi.mock('@devmentor/db', () => ({ User: UserEntity }));

const {
  BASELINE_ROLE,
  diffRoles,
  effectiveRoles,
  normalizeRoles,
  reconcileOperatorRole,
  resolveRoles,
  ROLES,
  sameRoles,
} = await import('./roles');

const VERIFIED = new Date('2026-10-01T00:00:00.000Z');
const FOUNDER = 'founder@devmentor.test';

interface Row {
  id: string;
  email: string;
  emailVerifiedAt: Date | null;
  roles: string[];
  sessionVersion: number;
}

function row(overrides: Partial<Row> = {}): Row {
  return {
    id: 'user-1',
    email: 'grace@devmentor.test',
    emailVerifiedAt: VERIFIED,
    roles: ['mentee'],
    sessionVersion: 4,
    ...overrides,
  };
}

describe('ROLES and BASELINE_ROLE', () => {
  it('lists every role in the fixed union, with mentee as the baseline', () => {
    expect(ROLES).toEqual(['mentee', 'mentor', 'operator']);
    expect(BASELINE_ROLE).toBe('mentee');
  });
});

describe('normalizeRoles', () => {
  it('is order-stable: any input order comes out in ROLES order', () => {
    expect(normalizeRoles(['operator', 'mentor', 'mentee'])).toEqual(['mentee', 'mentor', 'operator']);
    expect(normalizeRoles(['mentor', 'mentee'])).toEqual(['mentee', 'mentor']);
  });

  it('is duplicate-free and drops values outside the union', () => {
    expect(normalizeRoles(['mentor', 'mentor', 'student', 'mentor'])).toEqual(['mentor']);
    expect(normalizeRoles([])).toEqual([]);
  });
});

describe('resolveRoles', () => {
  it('returns the stored mentee and mentor roles in canonical order', () => {
    expect(resolveRoles(row({ roles: ['mentor', 'mentee'] }), [])).toEqual(['mentee', 'mentor']);
  });

  it('drops duplicates and values outside the role union', () => {
    expect(resolveRoles(row({ roles: ['mentor', 'mentor', 'student'] }), [])).toEqual(['mentor']);
  });

  it('ignores a stored operator cache that the allowlist no longer backs', () => {
    expect(resolveRoles(row({ email: FOUNDER, roles: ['mentor', 'operator'] }), [])).toEqual([
      'mentor',
    ]);
  });

  it('grants operator live to a verified allowlisted email, matched case-insensitively', () => {
    expect(resolveRoles(row({ email: 'Founder@DevMentor.test', roles: ['mentee'] }), [FOUNDER])).toEqual([
      'mentee',
      'operator',
    ]);
  });

  it('does not grant operator to an unverified row, even when allowlisted', () => {
    expect(resolveRoles(row({ email: FOUNDER, emailVerifiedAt: null }), [FOUNDER])).toEqual(['mentee']);
    expect(resolveRoles({ email: FOUNDER, roles: ['mentee'] }, [FOUNDER])).toEqual(['mentee']);
  });

  it('can resolve to an empty set, which effectiveRoles then handles', () => {
    expect(resolveRoles(row({ roles: [] }), [])).toEqual([]);
  });
});

describe('effectiveRoles', () => {
  it('is the resolved set whenever that is non-empty', () => {
    expect(effectiveRoles(row({ email: FOUNDER, roles: ['mentor'] }), [FOUNDER])).toEqual([
      'mentor',
      'operator',
    ]);
  });

  it('falls back to mentee when de-listing an operator-only account would leave nothing', () => {
    expect(effectiveRoles(row({ email: FOUNDER, roles: ['operator'] }), [])).toEqual(['mentee']);
    // An unverified operator-only row is never promoted, so it falls back the same way.
    expect(effectiveRoles(row({ email: FOUNDER, emailVerifiedAt: null, roles: ['operator'] }), [FOUNDER])).toEqual([
      'mentee',
    ]);
  });

  it('is null for a stored set with no valid role at all (corrupt data)', () => {
    expect(effectiveRoles(row({ roles: [] }), [])).toBeNull();
    expect(effectiveRoles(row({ roles: ['student'] }), [])).toBeNull();
  });
});

describe('sameRoles', () => {
  it('compares element by element, so order and duplicates count', () => {
    expect(sameRoles(['mentee', 'mentor'], ['mentee', 'mentor'])).toBe(true);
    expect(sameRoles(['mentor', 'mentee'], ['mentee', 'mentor'])).toBe(false);
    expect(sameRoles(['mentee', 'mentee'], ['mentee'])).toBe(false);
  });
});

describe('diffRoles', () => {
  it('reports added and removed membership in ROLES order', () => {
    expect(diffRoles(['operator', 'mentee'], ['mentor', 'mentee'])).toEqual({
      added: ['mentor'],
      removed: ['operator'],
    });
    expect(diffRoles(['mentor', 'mentee'], ['mentee', 'mentor'])).toEqual({ added: [], removed: [] });
  });
});

describe('reconcileOperatorRole', () => {
  const em = { nativeUpdate: vi.fn(async () => 1) };
  const eventBus = { emit: vi.fn(async () => undefined) };
  let operatorEmails: readonly string[];
  const deps = () => ({ em, eventBus, env: { OPERATOR_EMAILS: operatorEmails } }) as never;

  beforeEach(() => {
    vi.clearAllMocks();
    em.nativeUpdate.mockResolvedValue(1);
    operatorEmails = [];
  });

  it('writes nothing and emits nothing when the stored set already agrees', async () => {
    await expect(reconcileOperatorRole(row({ roles: ['mentee', 'mentor'] }), deps())).resolves.toEqual([
      'mentee',
      'mentor',
    ]);
    expect(em.nativeUpdate).not.toHaveBeenCalled();
    expect(eventBus.emit).not.toHaveBeenCalled();
  });

  it('promotes a verified allowlisted user, preserving mentor, without bumping sessionVersion', async () => {
    operatorEmails = [FOUNDER];

    const roles = await reconcileOperatorRole(row({ email: FOUNDER, roles: ['mentor'] }), deps());

    expect(roles).toEqual(['mentor', 'operator']);
    expect(em.nativeUpdate).toHaveBeenCalledWith(
      UserEntity,
      { id: 'user-1', sessionVersion: 4 },
      { roles: ['mentor', 'operator'] },
    );
    // The write data never carries sessionVersion: it is only the precondition.
    expect((em.nativeUpdate.mock.calls[0] as unknown[])[2]).not.toHaveProperty('sessionVersion');
    expect(eventBus.emit).toHaveBeenCalledWith('auth.user.roles_changed', {
      userId: 'user-1',
      added: ['operator'],
      removed: [],
    });
  });

  it('demotes a de-listed operator, preserving mentor', async () => {
    const roles = await reconcileOperatorRole(row({ email: FOUNDER, roles: ['mentor', 'operator'] }), deps());

    expect(roles).toEqual(['mentor']);
    expect(em.nativeUpdate).toHaveBeenCalledWith(
      UserEntity,
      { id: 'user-1', sessionVersion: 4 },
      { roles: ['mentor'] },
    );
    expect(eventBus.emit).toHaveBeenCalledWith('auth.user.roles_changed', {
      userId: 'user-1',
      added: [],
      removed: ['operator'],
    });
  });

  it('demotes an operator-only account to mentee rather than an empty set', async () => {
    await expect(reconcileOperatorRole(row({ email: FOUNDER, roles: ['operator'] }), deps())).resolves.toEqual([
      'mentee',
    ]);
    expect(em.nativeUpdate).toHaveBeenCalledWith(
      UserEntity,
      { id: 'user-1', sessionVersion: 4 },
      { roles: ['mentee'] },
    );
    expect(eventBus.emit).toHaveBeenCalledWith('auth.user.roles_changed', {
      userId: 'user-1',
      added: ['mentee'],
      removed: ['operator'],
    });
  });

  it('never promotes an unverified allowlisted email', async () => {
    operatorEmails = [FOUNDER];

    await expect(
      reconcileOperatorRole(row({ email: FOUNDER, emailVerifiedAt: null, roles: ['mentee'] }), deps()),
    ).resolves.toEqual(['mentee']);
    expect(em.nativeUpdate).not.toHaveBeenCalled();
  });

  it('normalizes an out-of-order or duplicated set silently, without an event', async () => {
    await expect(
      reconcileOperatorRole(row({ roles: ['mentor', 'mentee', 'mentor'] }), deps()),
    ).resolves.toEqual(['mentee', 'mentor']);
    expect(em.nativeUpdate).toHaveBeenCalledWith(
      UserEntity,
      { id: 'user-1', sessionVersion: 4 },
      { roles: ['mentee', 'mentor'] },
    );
    expect(eventBus.emit).not.toHaveBeenCalled();
  });

  it('emits nothing when a concurrent role change already moved sessionVersion on', async () => {
    em.nativeUpdate.mockResolvedValue(0);
    operatorEmails = [FOUNDER];

    await expect(reconcileOperatorRole(row({ email: FOUNDER }), deps())).resolves.toEqual([
      'mentee',
      'operator',
    ]);
    expect(em.nativeUpdate).toHaveBeenCalledTimes(1);
    expect(eventBus.emit).not.toHaveBeenCalled();
  });

  it('throws an internal error, writing nothing, for a set with no valid role', async () => {
    await expect(reconcileOperatorRole(row({ roles: [] }), deps())).rejects.toThrow(
      'User user-1 has no effective role (stored roles: [])',
    );
    await expect(reconcileOperatorRole(row({ roles: ['student'] }), deps())).rejects.toThrow(
      /stored roles: \[student\]/,
    );
    expect(em.nativeUpdate).not.toHaveBeenCalled();
  });
});
