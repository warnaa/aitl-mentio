import { z } from 'zod';
export const paymentIdSchema = z.uuid();
export const bookingPersonaSchema = z.enum(['mentee', 'mentor']).default('mentee');
export const paymentResolutionSchema = z.object({ action: z.enum(['confirm', 'release']), reason: z.string().trim().min(1).max(500), sessionId: z.string().min(1).max(255).optional() });
