import { z } from 'zod';
import { emailField, passwordField, returnToField } from './password';

/**
 * `POST /api/auth/login` (E01 #32), shared by the route and the sign-in form. No
 * minimum length beyond "not empty": a sign-in must not reveal the registration
 * policy, and a wrong password is answered generically by the service.
 */
export const loginSchema = z.object({
  email: emailField,
  password: passwordField.refine((value) => value.length > 0, 'Enter your password.'),
  returnTo: returnToField,
});

export type LoginInput = z.infer<typeof loginSchema>;
