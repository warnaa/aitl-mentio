import { z } from 'zod';
import { DEMO_PASSWORD } from './model.ts';

// Local schemas preserve production constraints without importing the app or data layer.
// CrudForm hides a field's description while it shows an error, so every password error
// repeats the demo password that the description would otherwise show.
const useDemo = `Użyj hasła demo: ${DEMO_PASSWORD}`;
const email = z.string({ error: 'Wpisz poprawny adres e-mail demo' }).trim().toLowerCase().pipe(z.email({ error: 'Wpisz poprawny adres e-mail demo' }).max(320, 'Maksymalnie 320 znaków'));
const password = z.string({ error: `Wpisz hasło demo: ${DEMO_PASSWORD}` }).min(1, `Wpisz hasło demo: ${DEMO_PASSWORD}`).refine(value => new TextEncoder().encode(value).length <= 72, `Hasło może mieć maksymalnie 72 bajty UTF-8. ${useDemo}`);
export const loginSchema = z.object({ email, password });
export const registerSchema = z.object({ name: z.string({ error: 'Wpisz imię i nazwisko demo' }).trim().min(1, 'Wpisz imię i nazwisko demo').max(80, 'Maksymalnie 80 znaków'), email, password: password.refine(value => Array.from(value).length >= 10, `Hasło musi mieć co najmniej 10 znaków. ${useDemo}`) });
export const introSchema = z.object({ displayName: z.string(), slug: z.string() });
