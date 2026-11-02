import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loginSchema, registerSchema } from './forms.ts';
import { DEMO_PASSWORD } from './model.ts';

function passwordErrors(schema: typeof loginSchema | typeof registerSchema, values: Record<string, unknown>): string[] {
  const result = schema.safeParse(values);
  assert.equal(result.success, false);
  return result.error!.issues.filter(issue => issue.path[0] === 'password').map(issue => issue.message);
}

test('every password error repeats the demo password, because CrudForm hides the field hint on error', () => {
  const login = { email: 'ada@example.test' };
  const register = { name: 'Nowa osoba', email: 'nowa@example.test' };
  const cases: [typeof loginSchema | typeof registerSchema, Record<string, unknown>, RegExp][] = [
    [loginSchema, { ...login }, /Wpisz hasło demo/],
    [loginSchema, { ...login, password: '' }, /Wpisz hasło demo/],
    [loginSchema, { ...login, password: 'ż'.repeat(37) }, /72 bajty/],
    [registerSchema, { ...register, password: '' }, /Wpisz hasło demo/],
    [registerSchema, { ...register, password: 'krótkie' }, /co najmniej 10 znaków/],
    [registerSchema, { ...register, password: 'ż'.repeat(37) }, /72 bajty/],
  ];
  for (const [schema, values, reason] of cases) {
    const messages = passwordErrors(schema, values);
    assert.ok(messages.length > 0, JSON.stringify(values));
    assert.ok(messages.some(message => reason.test(message)), messages.join(' | '));
    for (const message of messages) assert.ok(message.includes(DEMO_PASSWORD), message);
  }
});

test('the demo credentials pass both forms', () => {
  assert.equal(loginSchema.safeParse({ email: 'ada@example.test', password: DEMO_PASSWORD }).success, true);
  assert.equal(registerSchema.safeParse({ name: 'Nowa osoba', email: 'nowa@example.test', password: DEMO_PASSWORD }).success, true);
});
