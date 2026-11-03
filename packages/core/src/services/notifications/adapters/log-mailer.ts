import type { Logger } from '../../../logger';
import type { Mailer, MailMessage } from '../mailer.port';

/** The `msg` of the line every logged message produces; the harness's `waitForMail` matches it. */
export const MAIL_SENT_LOG_MESSAGE = 'mail.sent';

/**
 * Development and integration-harness mail: nothing is delivered; each message becomes
 * one structured pino line — `{ msg: 'mail.sent', to, subject, text }` — so a developer
 * can open the verification link from the terminal and the harness can read it from
 * the app log. It logs the body on purpose, which is why it is never selected in
 * production without `INTEGRATION_TEST_RUN=1` (see `container.ts`).
 */
export class LogMailer implements Mailer {
  private readonly logger: Pick<Logger, 'info'>;

  constructor({ logger }: { logger: Pick<Logger, 'info'> }) {
    this.logger = logger;
  }

  async send({ to, subject, text }: MailMessage): Promise<void> {
    this.logger.info({ to, subject, text }, MAIL_SENT_LOG_MESSAGE);
  }
}
