import { expect, it } from 'vitest';
import { noteApproveSchema, noteDeclineSchema } from './note-decline.schema';

it('binds an approval to one positive version and strips everything else', () => {
  expect(noteApproveSchema.parse({ version: 2, status: 'draft' })).toEqual({ version: 2 });
  for (const version of [undefined, 0, -1, 1.5, '1']) expect(noteApproveSchema.safeParse({ version }).success).toBe(false);
});

it('normalizes the comment and refuses a missing, blank, oversized or NUL comment on the comment field', () => {
  expect(noteDeclineSchema.parse({ version: 1, comment: '  add\r\nthe error case ', author: 'x' })).toEqual({ version: 1, comment: 'add\nthe error case' });
  expect(noteDeclineSchema.parse({ version: 1, comment: 'x'.repeat(2000) }).comment).toHaveLength(2000);
  for (const comment of [undefined, '', '   ', 'x'.repeat(2001), 'x\u0000']) {
    const result = noteDeclineSchema.safeParse({ version: 1, comment });
    expect(result.success).toBe(false);
    expect(result.error!.issues[0]!.path).toEqual(['comment']);
  }
  expect(noteDeclineSchema.safeParse({ version: 0, comment: 'x' }).success).toBe(false);
});
