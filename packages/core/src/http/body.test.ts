import { z } from 'zod';
import { describe, expect, it } from 'vitest';
import { flattenZodError, parseJsonBody, parseWith } from './body';
import { BadRequestError, ValidationError } from './errors';

const schema = z.object({ name: z.string().min(1, 'Required'), tags: z.array(z.string().min(2, 'Too short')).optional() });
const post = (body: string) => new Request('http://devmentor.test/api/x', { method: 'POST', body });

describe('parseJsonBody', () => {
  it('returns the parsed body', async () => {
    await expect(parseJsonBody(post('{"name":"Ada"}'), schema)).resolves.toEqual({ name: 'Ada' });
  });

  it('answers 400 for a body that is not JSON', async () => {
    await expect(parseJsonBody(post('not json'), schema)).rejects.toThrow(new BadRequestError('Request body must be valid JSON'));
  });

  it('answers 422 with field errors keyed by dotted path', async () => {
    const error = await parseJsonBody(post('{"name":"","tags":["ok","x"]}'), schema).catch((thrown: unknown) => thrown);
    expect(error).toBeInstanceOf(ValidationError);
    expect((error as ValidationError).fieldErrors).toEqual({ name: ['Required'], 'tags.1': ['Too short'] });
  });
});

describe('parseWith / flattenZodError', () => {
  it('keys a root-level issue as _root', () => {
    const result = z.string().safeParse(1);
    expect(flattenZodError(result.error!)).toEqual({ _root: [expect.any(String)] });
    expect(() => parseWith(z.string(), 1)).toThrow(ValidationError);
  });

  it('collects several messages for one field', () => {
    const many = z.object({ a: z.string().min(3, 'min').regex(/x/, 'needs x') });
    expect(flattenZodError(many.safeParse({ a: 'b' }).error!)).toEqual({ a: ['min', 'needs x'] });
  });
});
