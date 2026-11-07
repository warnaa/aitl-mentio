import { z } from 'zod';

/** The longest message a party can post; the screen's composer enforces the same limit. */
export const MESSAGE_MAX_LENGTH = 4000;

/**
 * One line of plain text. Line endings are normalised to `\n` and the ends are trimmed
 * before the limits apply. NUL is rejected because PostgreSQL cannot store it. Unknown
 * keys are stripped.
 */
export const messageCreateSchema = z.object({
  body: z
    .string()
    .transform(value => value.replace(/\r\n?/g, '\n').trim())
    .pipe(
      z
        .string()
        .min(1, 'Write a message before sending.')
        .max(MESSAGE_MAX_LENGTH, 'Keep this message under 4,000 characters.')
        .refine(value => !value.includes('\u0000'), 'The message contains a character that cannot be sent.'),
    ),
});
export type MessageCreate = z.infer<typeof messageCreateSchema>;
