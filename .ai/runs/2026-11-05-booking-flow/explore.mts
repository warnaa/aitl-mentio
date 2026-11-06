import { readFile, writeFile } from 'node:fs/promises';
import { runNpm } from '../../../tests/integration/npm';
import { integrationChildEnvironment } from '../../../tests/integration/environment';
const state = JSON.parse(await readFile('.ai/qa/test-env.json', 'utf8'));
const base = state.baseUrl;
const auth = async (login: string) => {
  const start = await fetch(`${base}/api/auth/github?login=${login}`, { redirect: 'manual' });
  const callback = await fetch(start.headers.get('location')!, { redirect: 'manual', headers: { cookie: start.headers.get('set-cookie')!.split(';')[0]! } });
  return { cookie: callback.headers.get('set-cookie')!.split(';')[0]!, 'x-devmentor-request': '1', 'content-type': 'application/json' };
};
const login = 'booking-explore-mentor';
let mentor = await auth(login);
const output = await runNpm(['run', 'invite', '--', 'create', '--operator', 'integration', '--email', `${login}@devmentor.test`, '--tags', 'react'], integrationChildEnvironment(state.services[0].url, base));
const link = output.split(/\r?\n/).find(line => line.startsWith(`${base}/invitation/`))!;
const acceptance = await fetch(`${base}/api/invitations/${new URL(link).pathname.split('/').at(-1)}/accept`, { method: 'POST', headers: mentor });
mentor = { ...mentor, cookie: acceptance.headers.get('set-cookie')!.split(';')[0]! };
const request = async (path: string, method: string, body?: unknown, headers = mentor) => {
  const response = await fetch(`${base}${path}`, { method, headers, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const payload = await response.json();
  if (!response.ok) throw new Error(`${method} ${path}: ${response.status} ${JSON.stringify(payload)}`);
  return payload.data;
};
await request('/api/mentors/me', 'PUT', { publicWorkUrl: 'https://github.com/devmentor-fixture', bio: 'Booking exploration mentor.', stackTags: ['react'] });
await request('/api/mentors/me/prices', 'PUT', { price25: '80', price50: '160' });
const profile = await request('/api/mentors/me/publish', 'POST');
const slot = await request('/api/availability/slots', 'POST', { startsAt: '2099-11-06T12:00:00.000Z' });
await request('/api/availability/slots', 'POST', { startsAt: new Date(Date.now() + 3600000).toISOString() });
const apiSlot = await request('/api/availability/slots', 'POST', { startsAt: '2099-11-07T12:00:00.000Z' });
const mentee = await auth('booking-explore-mentee');
for (const [name, body, headers] of [
  ['missing-csrf', { slotId: apiSlot.id, lengthMinutes: 25 }, { cookie: mentee.cookie }],
  ['invalid', { slotId: 'bad', lengthMinutes: 30 }, mentee],
  ['create', { slotId: apiSlot.id, lengthMinutes: 25, priceCents: 1 }, mentee],
  ['retry', { slotId: apiSlot.id, lengthMinutes: 25 }, mentee],
] as const) {
  const response = await fetch(`${base}/api/bookings`, { method: 'POST', headers, body: JSON.stringify(body) });
  const result = await response.json();
  console.log(JSON.stringify({ name, status: response.status, result }));
}
await writeFile('.ai/runs/2026-11-05-booking-flow/exploration-fixture.json', JSON.stringify({ base, slug: profile.slug, slotId: slot.id }));
console.log(JSON.stringify({ base, slug: profile.slug, slotId: slot.id }));
