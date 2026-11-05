import { afterEach, describe, expect, it, vi } from 'vitest';
import { withScope } from '@devmentor/core';
import { main, parseInviteCommand, runInvite, type InviteCommand } from './invite';

vi.mock('@devmentor/core', () => ({ withScope: vi.fn() }));
afterEach(() => {
  vi.restoreAllMocks();
  vi.resetAllMocks();
});

const NOW = new Date('2026-11-04T12:00:00Z');
const LINK = 'https://devmentor.test/invitation/raw-secret';

function effects() {
  const lines: string[] = [];
  const service = {
    create: vi.fn().mockResolvedValue({ id: 'inv-1', link: LINK }),
    revoke: vi.fn().mockResolvedValue({ id: 'inv-1' }),
    resend: vi.fn().mockResolvedValue({ id: 'inv-1', link: LINK }),
  };
  return { lines, service, write: (line: string) => lines.push(line), now: () => NOW };
}

describe('parseInviteCommand', () => {
  it('parses create with trimmed tags and an optional batch', () => {
    expect(
      parseInviteCommand(['create', '--operator', 'ada', '--email', 'Grace@Example.test', '--tags', 'react, python ', '--batch', 'b1']),
    ).toEqual({
      action: 'create',
      operator: 'ada',
      email: 'Grace@Example.test',
      stackTags: ['react', 'python'],
      batch: 'b1',
      id: undefined,
    });
  });

  it.each(['revoke', 'resend'])('parses %s by id with no tags', (action) => {
    expect(parseInviteCommand([action, '--operator', 'ada', '--id', 'inv-1'])).toMatchObject({
      action,
      operator: 'ada',
      id: 'inv-1',
      stackTags: [],
    });
  });

  it.each([
    [[]],
    [['delete', '--operator', 'ada']],
    [['create', '--operator']],
    [['create', '--operator', 'ada', '--email', 'a@b.test']],
    [['create', '--email', 'a@b.test', '--tags', 'react']],
    [['create', '--operator', ' ', '--email', 'a@b.test', '--tags', 'react']],
    [['create', '--operator', 'ada', '--operator', 'bob', '--email', 'a@b.test', '--tags', 'react']],
    [['create', '--operator', 'ada', '--id', 'inv-1', '--email', 'a@b.test', '--tags', 'react']],
    [['revoke', '--operator', 'ada']],
    [['resend', '--operator', 'ada', '--email', 'a@b.test']],
  ])('refuses %j with the usage line', (args) => {
    expect(() => parseInviteCommand(args)).toThrow(/^Use invite create --operator/);
  });
});

describe('runInvite', () => {
  const create: InviteCommand = { action: 'create', operator: 'ada', email: 'a@b.test', stackTags: ['react'] };

  it('creates, then prints a token-free audit line before the link', async () => {
    const io = effects();
    await runInvite({ ...create, batch: 'b1' }, io);
    expect(io.service.create).toHaveBeenCalledWith({ email: 'a@b.test', stackTags: ['react'], batch: 'b1' });
    expect(io.lines).toEqual([
      JSON.stringify({ action: 'invitation.create', operator: 'ada', invitationId: 'inv-1', at: NOW.toISOString() }),
      LINK,
    ]);
    expect(io.lines[0]).not.toContain('raw-secret');
  });

  it('revokes with only the audit line', async () => {
    const io = effects();
    await runInvite({ action: 'revoke', operator: 'ada', id: 'inv-1', stackTags: [] }, io);
    expect(io.service.revoke).toHaveBeenCalledWith('inv-1');
    expect(io.lines).toHaveLength(1);
    expect(JSON.parse(io.lines[0]!)).toMatchObject({ action: 'invitation.revoke', invitationId: 'inv-1' });
  });

  it('resends with a fresh link', async () => {
    const io = effects();
    await runInvite({ action: 'resend', operator: 'ada', id: 'inv-1', stackTags: [] }, io);
    expect(io.service.resend).toHaveBeenCalledWith('inv-1');
    expect(io.lines[1]).toBe(LINK);
  });

  it('prints nothing when the service refuses', async () => {
    const io = effects();
    io.service.create.mockRejectedValue(new Error('Resend or revoke the unresolved invitation for this address.'));
    await expect(runInvite(create, io)).rejects.toThrow('Resend or revoke');
    expect(io.lines).toEqual([]);
  });
});

describe('main', () => {
  const args = ['revoke', '--operator', 'ada', '--id', 'inv-1'];

  function scope() {
    const revoke = vi.fn().mockResolvedValue({ id: 'inv-1' });
    vi.mocked(withScope).mockImplementation(async (callback) =>
      callback({ invitationService: { revoke }, clock: { now: () => NOW } } as never),
    );
    return revoke;
  }

  it('loads the root .env and runs the command in a container scope', async () => {
    const load = vi.spyOn(process, 'loadEnvFile').mockImplementation(() => {});
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const revoke = scope();
    await main(args);
    expect(String(load.mock.calls[0]![0])).toMatch(/[\\/]\.env$/);
    expect(revoke).toHaveBeenCalledWith('inv-1');
    expect(log).toHaveBeenCalledWith(expect.stringContaining('"action":"invitation.revoke"'));
  });

  it('tolerates a missing .env so real environment values still work', async () => {
    vi.spyOn(process, 'loadEnvFile').mockImplementation(() => {
      throw Object.assign(new Error('missing'), { code: 'ENOENT' });
    });
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const revoke = scope();
    await main(args);
    expect(revoke).toHaveBeenCalled();
  });

  it('fails on an unreadable .env and before touching the database on bad arguments', async () => {
    vi.spyOn(process, 'loadEnvFile').mockImplementation(() => {
      throw Object.assign(new Error('denied'), { code: 'EACCES' });
    });
    await expect(main(args)).rejects.toThrow('denied');
    await expect(main(['nope'])).rejects.toThrow(/^Use invite/);
    expect(withScope).not.toHaveBeenCalled();
  });
});
