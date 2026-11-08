import { z } from 'zod';

export const NOTE_MAX_LENGTH = 20_000;
/** Plain text shared by the editor and service; unknown author/status keys are stripped. */
export const noteDraftSchema = z.object({
  body: z.string().transform(value => value.replace(/\r\n?/g, '\n').trim()).pipe(
    z.string().min(1, 'Write the session note before saving it.')
      .max(NOTE_MAX_LENGTH, 'Keep the session note under 20,000 characters.')
      .refine(value => !value.includes('\u0000'), 'The note contains a character that cannot be saved.'),
  ),
  expectedRevision: z.number().int().positive().nullable(),
});
export const noteSendSchema = z.object({ version: z.number().int().positive(), revision: z.number().int().positive() });
