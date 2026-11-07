import { plainName } from './booking-confirmed-mail';
import type { MailMessage } from './mailer.port';

export interface AnswerPostedMailInput {
  to: string;
  mentorName: string;
  sessionUrl: string;
}

/**
 * Tells the mentee that the written answer is on the session screen. It never carries the
 * answer itself: that is private to the two parties (R02) and may quote shared code (R19).
 * The subject is fixed so no user-controlled text reaches a header.
 */
export function answerPostedMail(input: AnswerPostedMailInput): MailMessage {
  return {
    to: input.to,
    subject: 'Your DevMentor written answer is ready',
    text: [
      `${plainName(input.mentorName)} posted the written answer for your session.`,
      '',
      'Read it on the session page; it stays there for you to come back to.',
      '',
      `Your session: ${input.sessionUrl}`,
    ].join('\n'),
  };
}
