import { z } from 'zod';

/**
 * The outcome the mentee saw in the confirmation dialog. The server decides the refund
 * itself and refuses when the two disagree, so a mentee never confirms the wrong outcome.
 */
export const bookingCancelSchema = z.strictObject({ expectRefund: z.boolean() });
export type BookingCancel = z.infer<typeof bookingCancelSchema>;
