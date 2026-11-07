import { expect, it } from 'vitest';
import { ANSWER_MAX_LENGTH, answerUpdateSchema } from './answer-update.schema';

it('normalises line endings, trims and strips unknown keys', () => {
  expect(answerUpdateSchema.parse({ body: '  Use a union.\r\nThen narrow.\r  ', extra: 1 })).toEqual({ body: 'Use a union.\nThen narrow.' });
});

it('accepts exactly the longest answer and refuses one character more', () => {
  expect(answerUpdateSchema.safeParse({ body: 'a'.repeat(ANSWER_MAX_LENGTH) }).success).toBe(true);
  expect(answerUpdateSchema.safeParse({ body: 'a'.repeat(ANSWER_MAX_LENGTH + 1) }).error?.issues[0]?.message).toBe('Keep the written answer under 20,000 characters.');
});

it.each([
  ['an empty answer', '', 'Write the answer before posting it.'],
  ['whitespace only', ' \n\t ', 'Write the answer before posting it.'],
  ['a NUL character', 'a\u0000b', 'The answer contains a character that cannot be saved.'],
])('refuses %s', (_case, body, message) => {
  expect(answerUpdateSchema.safeParse({ body }).error?.issues[0]?.message).toBe(message);
});

it('refuses a missing or non-string body', () => {
  expect(answerUpdateSchema.safeParse({}).success).toBe(false);
  expect(answerUpdateSchema.safeParse({ body: 5 }).success).toBe(false);
});
