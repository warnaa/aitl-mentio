import { z } from 'zod';
export const SessionLengths = {
  values: [25, 50] as const,
  schema: z.union([z.literal(25), z.literal(50)]),
};
