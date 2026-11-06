import { z } from 'zod';

/** At most one page of notifications can be marked read at once; unknown keys are stripped. */
export const notificationReadSchema = z.object({
  ids: z.array(z.uuid()).min(1).max(50),
});
export type NotificationRead = z.infer<typeof notificationReadSchema>;
