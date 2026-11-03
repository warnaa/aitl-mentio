import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { integrationArtifactsDirectory } from './agent-browser';

/** A message the app's log mailer wrote (`LogMailer`: `msg: 'mail.sent'`). */
export interface CapturedMail {
  to: string;
  subject: string;
  text: string;
  /** pino's epoch-milliseconds `time`. */
  time: number;
}

/** Where `global-setup.ts` pipes the app's stdout. */
export const APP_LOG_PATH = resolve(integrationArtifactsDirectory, 'app.log');

export interface WaitForMailOptions {
  /** Only messages logged at or after this epoch-ms time count; pass `Date.now()` from before the action. */
  since?: number;
  timeoutMs?: number;
  intervalMs?: number;
  logPath?: string;
}

function parseMail(line: string): CapturedMail | null {
  if (!line.includes('"mail.sent"')) return null;
  try {
    const entry = JSON.parse(line) as Partial<CapturedMail> & { msg?: unknown };
    if (entry.msg !== 'mail.sent' || typeof entry.to !== 'string' || typeof entry.text !== 'string') return null;
    return { to: entry.to, subject: String(entry.subject ?? ''), text: entry.text, time: Number(entry.time ?? 0) };
  } catch {
    return null; // a non-JSON line (Next's own banner, a stack trace) is not mail
  }
}

/**
 * Wait for the first message to `to` (case-insensitive) logged since `since`, polling
 * the app log (primitives spec B14). The registration scenario follows the real link
 * this returns — no test signs its own token to skip the mail.
 *
 * @throws after `timeoutMs` with how many messages were seen, so a failure says why.
 */
export async function waitForMail(to: string, options: WaitForMailOptions = {}): Promise<CapturedMail> {
  const { since = 0, timeoutMs = 15_000, intervalMs = 200, logPath = APP_LOG_PATH } = options;
  const deadline = Date.now() + timeoutMs;
  const address = to.toLowerCase();
  let seen = 0;
  for (;;) {
    const log = await readFile(logPath, 'utf8').catch(() => '');
    const mails = log.split('\n').map(parseMail).filter((mail): mail is CapturedMail => mail !== null);
    seen = mails.length;
    const match = mails.find((mail) => mail.to.toLowerCase() === address && mail.time >= since);
    if (match) return match;
    if (Date.now() >= deadline) {
      throw new Error(`no mail to ${to} within ${timeoutMs} ms (${seen} mail.sent line(s) in ${logPath})`);
    }
    await new Promise((settle) => setTimeout(settle, intervalMs));
  }
}

/** The first `http(s)://` URL in a message's text — the verification link. */
export function firstLink(mail: CapturedMail): string {
  const link = /https?:\/\/\S+/.exec(mail.text)?.[0];
  if (!link) throw new Error(`mail to ${mail.to} has no link: ${mail.text}`);
  return link;
}
