import type { AppEnv } from '../../../config/env';
import { ServiceUnavailableError } from '../../../http/errors';
import { fetchJson } from '../../../http/outbound';
import type { Mailer, MailMessage } from '../mailer.port';

/** Resend's send endpoint. The adapter is named after the provider: this JSON shape is not portable. */
export const RESEND_EMAILS_URL = 'https://api.resend.com/emails';

/**
 * Production mail over Resend's HTTP API: one `fetchJson` call, no SMTP client and no
 * SDK. `fetchJson` bounds it with a timeout and never logs the body or headers, so
 * neither the API key nor the message (with its verification link) reaches a log.
 */
export class ResendMailer implements Mailer {
  private readonly env: Pick<AppEnv, 'MAIL_API_KEY' | 'MAIL_FROM'>;

  constructor({ env }: { env: Pick<AppEnv, 'MAIL_API_KEY' | 'MAIL_FROM'> }) {
    this.env = env;
  }

  /** @throws ServiceUnavailableError when unconfigured, or Resend fails, times out or refuses. */
  async send({ to, subject, text }: MailMessage): Promise<void> {
    const { MAIL_API_KEY: apiKey, MAIL_FROM: from } = this.env;
    if (!apiKey || !from) {
      throw new ServiceUnavailableError('Email delivery is not configured.');
    }
    await fetchJson(RESEND_EMAILS_URL, {
      method: 'POST',
      headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({ from, to: [to], subject, text }),
    });
  }
}
