/** One transactional, plain-text message. */
export interface MailMessage {
  to: string;
  subject: string;
  text: string;
}

/**
 * Outbound transactional mail (primitives spec B14). Adapters: `ResendMailer`
 * (production, Resend's HTTP API) and `LogMailer` (development, and the integration
 * harness with `MAILER_ADAPTER=log` + `INTEGRATION_TEST_RUN=1`).
 *
 * `send` resolves only once the provider accepted the message. A failure throws
 * `ServiceUnavailableError`, so a caller such as registration fails closed and never
 * reports success for mail it could not deliver.
 */
export interface Mailer {
  send(message: MailMessage): Promise<void>;
}
