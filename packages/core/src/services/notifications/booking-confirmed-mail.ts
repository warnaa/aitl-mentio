import type { MailMessage } from './mailer.port';

export type Audience = 'mentee' | 'mentor';

export interface BookingConfirmedMailInput {
  to: string;
  audience: Audience;
  counterpartName: string;
  startsAt: Date;
  lengthMinutes: number;
  sessionsUrl: string;
}

/** Names are user-controlled; keep them on one plain-text line. */
export function plainName(name: string): string {
  return name.replace(/[\u0000-\u001f\u007f]+/g, ' ').trim();
}

export const START_FORMAT = new Intl.DateTimeFormat('en-GB', {
  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  hour: '2-digit', minute: '2-digit', timeZone: 'UTC', timeZoneName: 'short',
});

/**
 * The confirmation email for one participant. It states the slot's start in UTC (D22),
 * the length and only the other party's display name, never their address, and repeats
 * that sessions are text with no speed promise (R03, R14). The subject is fixed so no
 * user-controlled text reaches a header.
 */
export function bookingConfirmedMail(input: BookingConfirmedMailInput): MailMessage {
  const mentee = input.audience === 'mentee';
  const lines = [
    mentee ? 'Your session is confirmed.' : 'A session has been booked with you.',
    '',
    `${mentee ? 'Mentor' : 'Mentee'}: ${plainName(input.counterpartName)}`,
    `Starts: ${START_FORMAT.format(input.startsAt)}`,
    `Length: ${input.lengthMinutes} minutes`,
    '',
    'This is a text session. DevMentor makes no promise about how soon an answer arrives.',
    '',
    `Your sessions: ${input.sessionsUrl}`,
  ];
  return {
    to: input.to,
    subject: mentee ? 'Your DevMentor session is confirmed' : 'A DevMentor session was booked with you',
    text: lines.join('\n'),
  };
}
