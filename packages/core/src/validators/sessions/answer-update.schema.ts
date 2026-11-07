import { z } from 'zod';

/** The longest written answer a mentor can post; the database checks the same bound. */
export const ANSWER_MAX_LENGTH = 20000;

/**
 * The mentor's written answer, plain text. Line endings are normalised to `\n` and the ends
 * are trimmed before the limits apply. NUL is rejected because PostgreSQL cannot store it.
 * Unknown keys are stripped.
 */
export const answerUpdateSchema = z.object({
  body: z
    .string()
    .transform(value => value.replace(/\r\n?/g, '\n').trim())
    .pipe(
      z
        .string()
        .min(1, 'Write the answer before posting it.')
        .max(ANSWER_MAX_LENGTH, 'Keep the written answer under 20,000 characters.')
        .refine(value => !value.includes('\u0000'), 'The answer contains a character that cannot be saved.'),
    ),
});
export type AnswerUpdate = z.infer<typeof answerUpdateSchema>;
