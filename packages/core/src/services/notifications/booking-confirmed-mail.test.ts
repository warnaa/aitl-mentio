import { expect, it } from 'vitest';
import { bookingConfirmedMail, plainName } from './booking-confirmed-mail';

const base = {
  to: 'person@example.com',
  counterpartName: 'Alex Mentor',
  startsAt: new Date('2026-11-12T14:00:00Z'),
  lengthMinutes: 25,
  sessionsUrl: 'https://devmentor.example/home',
};

it('tells a mentee the mentor, start, length and the text-session promise, without any address', () => {
  const mail = bookingConfirmedMail({ ...base, audience: 'mentee' });
  expect(mail).toMatchObject({ to: 'person@example.com', subject: 'Your DevMentor session is confirmed' });
  expect(mail.text).toContain('Your session is confirmed.');
  expect(mail.text).toContain('Mentor: Alex Mentor');
  expect(mail.text).toContain('14:00 UTC');
  expect(mail.text).toContain('Length: 25 minutes');
  expect(mail.text).toContain('This is a text session. DevMentor makes no promise about how soon an answer arrives.');
  expect(mail.text).toContain('https://devmentor.example/home');
});

it('tells a mentor the mentee name and keeps user-controlled text out of the subject and onto one line', () => {
  const mail = bookingConfirmedMail({ ...base, audience: 'mentor', counterpartName: 'Sam\r\nBcc: x@example.com', lengthMinutes: 50, sessionsUrl: 'https://devmentor.example/mentor' });
  expect(mail.subject).toBe('A DevMentor session was booked with you');
  expect(mail.text).toContain('A session has been booked with you.');
  expect(mail.text).toContain('Mentee: Sam Bcc: x@example.com');
  expect(mail.text).toContain('Length: 50 minutes');
  expect(mail.text).not.toMatch(/\r/);
});

it('strips control characters and surrounding space from a display name', () => {
  expect(plainName('  Ada\u0000\tLovelace\u007f ')).toBe('Ada Lovelace');
});
