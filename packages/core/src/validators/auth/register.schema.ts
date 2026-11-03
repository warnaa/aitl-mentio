import { z } from 'zod';
import { emailField, PASSWORD_MIN_LENGTH, passwordField, returnToField } from './password';

/**
 * `POST /api/auth/register` (E01 #32), shared by the route and the registration form.
 * The 72-byte password cap is enforced as bytes (see `password.ts`).
 */
export const registerSchema = z.object({
  displayName: z.string().trim().min(1, 'Enter your name.').max(120, 'Use at most 120 characters.'),
  email: emailField,
  password: passwordField.refine(
    (value) => value.length >= PASSWORD_MIN_LENGTH,
    `Use at least ${PASSWORD_MIN_LENGTH} characters.`,
  ),
  returnTo: returnToField,
});

export type RegisterInput = z.infer<typeof registerSchema>;
