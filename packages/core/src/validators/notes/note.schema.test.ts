import { expect, it } from 'vitest';
import { noteDraftSchema, noteSendSchema } from './note.schema';

it('normalizes line endings and trims plain text, strips identity/status and bounds revisions', () => {
  expect(noteDraftSchema.parse({ body: '  first\r\nnext\rlast  ', expectedRevision: null, status: 'approved', author: 'other' })).toEqual({ body: 'first\nnext\nlast', expectedRevision: null });
  expect(noteDraftSchema.parse({ body: 'x'.repeat(20000), expectedRevision: 1 }).body).toHaveLength(20000);
  for (const body of ['', '   ', 'x'.repeat(20001), 'x\u0000']) expect(noteDraftSchema.safeParse({ body, expectedRevision: null }).success).toBe(false);
  for (const expectedRevision of [undefined, 0, -1, 1.5, '1']) expect(noteDraftSchema.safeParse({ body: 'x', expectedRevision }).success).toBe(false);
  expect(noteDraftSchema.parse({ body: 'x', expectedRevision: 1, expectedVersion: 2 }).expectedVersion).toBe(2);
  for (const expectedVersion of [0, 1.5, '1']) expect(noteDraftSchema.safeParse({ body: 'x', expectedRevision: 1, expectedVersion }).success).toBe(false);
  expect(noteSendSchema.parse({ version: 1, revision: 2, body: 'ignored' })).toEqual({ version: 1, revision: 2 });
  for (const value of [0, -1, 1.5, null, '1']) {
    expect(noteSendSchema.safeParse({ version: value, revision: 1 }).success).toBe(false);
    expect(noteSendSchema.safeParse({ version: 1, revision: value }).success).toBe(false);
  }
});
