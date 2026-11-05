import { z } from 'zod';
export const exactMajorDecimalString = z.string().max(11).regex(/^(0|[1-9]\d*)(\.\d{1,2})?$/, 'Enter an amount with at most two decimal places.');
export const mentorPricesUpdateSchema = z.object({ price25: exactMajorDecimalString, price50: exactMajorDecimalString });
export type MentorPricesUpdate = z.infer<typeof mentorPricesUpdateSchema>;
