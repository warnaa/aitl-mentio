import { z } from 'zod';
export const slotListSchema = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  past: z.enum(['true', 'false']).default('false').transform(value => value === 'true'),
});
