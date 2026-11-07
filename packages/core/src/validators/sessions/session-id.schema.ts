import { z } from 'zod';

/** A text session is addressed by its booking's id. */
export const sessionBookingIdSchema = z.uuid();
