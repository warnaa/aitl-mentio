import { z } from 'zod';

/** Shape only: future-time policy uses the injected server clock in SlotService. */
export const slotCreateSchema = z.object({ startsAt: z.string().datetime() });
export type SlotCreate = z.infer<typeof slotCreateSchema>;
