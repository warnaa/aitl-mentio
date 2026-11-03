import { mkdtemp, rm, writeFile, appendFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { firstLink, waitForMail } from './mail';

/**
 * TC-MAIL-001 — the harness's mail reader against a log file it owns (no app needed):
 * it parses a captured `mail.sent` line, ignores noise and older mail, and times out
 * with a reason.
 */
let directory: string;
let logPath: string;

const line = (fields: Record<string, unknown>) => `${JSON.stringify({ level: 30, app: 'DevMentor', ...fields })}\n`;

beforeAll(async () => {
  directory = await mkdtemp(join(tmpdir(), 'devmentor-mail-'));
  logPath = join(directory, 'app.log');
});

afterAll(async () => {
  await rm(directory, { recursive: true, force: true });
});

describe('TC-MAIL-001 waitForMail', () => {
  it('returns the first message to the address since the given time, ignoring noise', async () => {
    await writeFile(
      logPath,
      [
        '   ▲ Next.js 16.3.3',
        line({ time: 1000, msg: 'mail.sent', to: 'grace@devmentor.test', subject: 'Old', text: 'https://old.example/x' }),
        line({ time: 2000, msg: 'request', to: 'grace@devmentor.test' }),
        '{"not json',
        line({ time: 3000, msg: 'mail.sent', to: 'ada@devmentor.test', subject: 'Other', text: 'https://other.example' }),
        line({ time: 4000, msg: 'mail.sent', to: 'Grace@DevMentor.Test', subject: 'Confirm', text: 'Open https://app.example/api/auth/verify-email?token=t1 now.' }),
      ].join('\n'),
    );

    const mail = await waitForMail('grace@devmentor.test', { since: 1500, logPath, timeoutMs: 1000 });

    expect(mail).toEqual({
      to: 'Grace@DevMentor.Test',
      subject: 'Confirm',
      text: 'Open https://app.example/api/auth/verify-email?token=t1 now.',
      time: 4000,
    });
    expect(firstLink(mail)).toBe('https://app.example/api/auth/verify-email?token=t1');
  });

  it('waits for a message that arrives while polling', async () => {
    await writeFile(logPath, '');
    setTimeout(() => {
      void appendFile(logPath, line({ time: 5000, msg: 'mail.sent', to: 'late@devmentor.test', subject: 'S', text: 'https://x.example' }));
    }, 150);

    await expect(waitForMail('late@devmentor.test', { logPath, timeoutMs: 3000, intervalMs: 50 })).resolves.toMatchObject({ time: 5000 });
  });

  it('times out with how many messages it saw, also when the log does not exist yet', async () => {
    await expect(waitForMail('nobody@devmentor.test', { logPath, timeoutMs: 120, intervalMs: 40 })).rejects.toThrow(
      /no mail to nobody@devmentor\.test within 120 ms \(1 mail\.sent line\(s\)/,
    );
    await expect(waitForMail('x@devmentor.test', { logPath: join(directory, 'missing.log'), timeoutMs: 50, intervalMs: 20 })).rejects.toThrow(
      /\(0 mail\.sent line\(s\)/,
    );
  });

  it('refuses a mail without a link', () => {
    expect(() => firstLink({ to: 'a@x', subject: '', text: 'no link here', time: 0 })).toThrow('has no link');
  });
});
