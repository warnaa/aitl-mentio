import { expect, it } from 'vitest';
import { mentorProfileUpdateSchema as schema } from './mentor-profile-update.schema';

it('bounds the public-work link to 2048 characters', () => {
  const at = (length: number) => `https://example.test/${'a'.repeat(length - 'https://example.test/'.length)}`;
  expect(schema.safeParse({ publicWorkUrl: at(2048) }).success).toBe(true);
  expect(schema.safeParse({ publicWorkUrl: at(2049) }).success).toBe(false);
});

it('accepts partial drafts, validates shape, and strips attempted privileged fields', () => {
  expect(schema.parse({})).toEqual({});
  expect(schema.parse({ bio: '  experience  ', slug: 'hijack', userId: 'other' })).toEqual({
    bio: 'experience',
  });
  expect(
    schema.parse({
      publicWorkUrl: 'http://example.test',
      stackTags: ['typescript', 'react', 'python', 'ai-agents'],
    }),
  ).toBeDefined();
  for (const input of [
    { publicWorkUrl: 'javascript:alert(1)' },
    { publicWorkUrl: 'ftp://example.test' },
    { bio: '' },
    { bio: 'a'.repeat(2001) },
    { stackTags: ['other'] },
    { stackTags: Array(5).fill('react') },
  ]) {
    expect(schema.safeParse(input).success).toBe(false);
  }
});
