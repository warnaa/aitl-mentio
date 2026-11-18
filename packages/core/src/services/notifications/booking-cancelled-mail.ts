import { plainName, START_FORMAT } from './booking-confirmed-mail';
import type { MailMessage } from './mailer.port';

export interface BookingCancelledMailInput {
  to: string;
  menteeName: string;
  startsAt: Date;
  lengthMinutes: number;
  /** Whether the mentee cancelled inside the free window (D10/R09). */
  refunded: boolean;
  sessionsUrl: string;
}

/**
 * Tells the mentor that the mentee cancelled. It states whether the cancellation was free
 * (refunded) or late (no refund) and carries no payment identifiers. The subject is fixed
 * so no user-controlled text reaches a header.
 */
export function bookingCancelledMail(input: BookingCancelledMailInput): MailMessage {
  return {
    to: input.to,
    subject: 'A DevMentor session was cancelled',
    text: [
      `${plainName(input.menteeName)} cancelled your ${input.lengthMinutes}-minute text session.`,
      '',
      `Was due to start: ${START_FORMAT.format(input.startsAt)}`,
      input.refunded
        ? 'They cancelled at least 24 hours before the start, so they get a full refund.'
        : 'They cancelled less than 24 hours before the start, so no refund is made.',
      'This time is available to book again.',
      '',
      `Your sessions: ${input.sessionsUrl}`,
    ].join('\n'),
  };
}
