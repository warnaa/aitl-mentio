import { Writable } from 'node:stream';
import { pino } from 'pino';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ pino: vi.fn(), env: { LOG_LEVEL: 'warn', APP_NAME: 'DevMentor' } }));
vi.mock('./config/env', () => ({ getEnv: () => state.env }));
vi.mock('pino', async (importOriginal) => {
  const actual = await importOriginal<typeof import('pino')>();
  state.pino.mockImplementation(actual.pino);
  return { ...actual, pino: (...args: Parameters<typeof actual.pino>) => state.pino(...args) };
});

const { createLogger, REDACTED_LOG_PATHS } = await import('./logger');

beforeEach(() => {
  state.pino.mockClear();
});

/** A real pino logger with the production redaction, writing JSON lines to `lines`. */
function capture() {
  const lines: Record<string, unknown>[] = [];
  const sink = new Writable({
    write(chunk: Buffer, _encoding, done) {
      lines.push(JSON.parse(chunk.toString()) as Record<string, unknown>);
      done();
    },
  });
  return { logger: pino({ redact: { paths: REDACTED_LOG_PATHS, censor: '[redacted]' } }, sink), lines };
}

describe('createLogger', () => {
  it('configures level, base and redaction from the environment', () => {
    const logger = createLogger();

    expect(state.pino).toHaveBeenCalledExactlyOnceWith({
      level: 'warn',
      base: { app: 'DevMentor' },
      redact: { paths: REDACTED_LOG_PATHS, censor: '[redacted]' },
    });
    expect(logger.level).toBe('warn');
  });
});

describe('REDACTED_LOG_PATHS', () => {
  it('censors credentials at the top level and one level deep', () => {
    const { logger, lines } = capture();
    logger.info({
      password: 'hunter2hunter2',
      passwordHash: 'scrypt$x',
      apiKey: 're_secret',
      user: { password: 'nested', passwordHash: 'scrypt$y', email: 'grace@devmentor.test' },
      request: { headers: { authorization: 'Bearer re_secret', cookie: 'devmentor_session=abc', accept: 'json' } },
    }, 'attempt');

    const line = JSON.stringify(lines[0]);
    for (const secret of ['hunter2hunter2', 'scrypt$x', 'scrypt$y', 're_secret', 'nested', 'devmentor_session=abc']) {
      expect(line).not.toContain(secret);
    }
    expect(lines[0]).toMatchObject({
      password: '[redacted]',
      user: { email: 'grace@devmentor.test', password: '[redacted]' },
      request: { headers: { accept: 'json', authorization: '[redacted]', cookie: '[redacted]' } },
    });
  });

  it('leaves a log-mailer line readable: to, subject and text are not credentials', () => {
    const { logger, lines } = capture();
    logger.info({ to: 'grace@devmentor.test', subject: 'Confirm', text: 'Open https://x/verify' }, 'mail.sent');
    expect(lines[0]).toMatchObject({ msg: 'mail.sent', to: 'grace@devmentor.test', text: 'Open https://x/verify' });
  });
});
