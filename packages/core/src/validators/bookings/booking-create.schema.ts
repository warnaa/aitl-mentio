import { z } from 'zod';
import { SessionLengths } from '../../domain/vocabularies/session-lengths';

export const bookingCreateSchema = z.object({
  slotId: z.uuid(),
  lengthMinutes: SessionLengths.schema,
});
export type BookingCreate = z.infer<typeof bookingCreateSchema>;
