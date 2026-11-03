import { describe, expect, it, vi } from 'vitest';
import { LogMailer, MAIL_SENT_LOG_MESSAGE } from './log-mailer';

describe('LogMailer', () => {
  it('writes one structured mail.sent line with to, subject and text, and delivers nothing', async () => {
    const logger = { info: vi.fn() };
    const message = { to: 'grace@devmentor.test', subject: 'Confirm your email', text: 'Open https://x/verify?token=t' };

    await expect(new LogMailer({ logger }).send(message)).resolves.toBeUndefined();

    expect(MAIL_SENT_LOG_MESSAGE).toBe('mail.sent');
    expect(logger.info).toHaveBeenCalledExactlyOnceWith(message, 'mail.sent');
  });
});
