import { z } from 'zod';

export const NOTE_COMMENT_MAX_LENGTH = 2_000;
const version = z.number().int().positive();

/** The exact sent version the mentee read; a decision never targets "whatever is latest". */
export const noteApproveSchema = z.object({ version });

/** R12: a decline always carries a comment. Plain text, shared by the form and the service. */
export const noteDeclineSchema = z.object({
  version,
  comment: z.string({ error: 'Tell the mentor what to change.' }).transform(value => value.replace(/\r\n?/g, '\n').trim()).pipe(
    z.string().min(1, 'Tell the mentor what to change.')
      .max(NOTE_COMMENT_MAX_LENGTH, 'Keep the comment under 2,000 characters.')
      .refine(value => !value.includes('\u0000'), 'The comment contains a character that cannot be saved.'),
  ),
});
