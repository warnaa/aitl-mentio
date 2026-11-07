import { expect, it } from 'vitest';
import { answerPostedMail } from './answer-posted-mail';

it('points the mentee to the session without the answer, keeping the name on one line', () => {
  const mail = answerPostedMail({ to: 'mentee@example.com', mentorName: 'Alex\nBcc: x', sessionUrl: 'https://devmentor.example/sessions/b1' });
  expect(mail.to).toBe('mentee@example.com');
  expect(mail.subject).toBe('Your DevMentor written answer is ready');
  expect(mail.text.split('\n')[0]).toBe('Alex Bcc: x posted the written answer for your session.');
  expect(mail.text).toContain('Your session: https://devmentor.example/sessions/b1');
});
