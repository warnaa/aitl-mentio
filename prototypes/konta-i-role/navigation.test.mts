import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Simulation } from './simulation.ts';
import { SCREENS, isScreen, type ScreenId } from './model.ts';

const ids = SCREENS.map(screen => screen.id);
// Expected landing for a direct visit (bar, URL hash or Back) with no returnTo; L04 and F2 from the screen map.
const expected: Record<string, Record<ScreenId, ScreenId>> = {
  guest: { s04:'s04', s01:'s01', s02:'s02', s03:'s01', s06:'s01', s07:'s01', s12:'s12', s08:'s08', s11:'s11' },
  'ada@example.test': { s04:'s04', s01:'s04', s02:'s04', s03:'s03', s06:'s08', s07:'s08', s12:'s12', s08:'s08', s11:'s11' },
  'tomasz@example.test': { s04:'s04', s01:'s06', s02:'s06', s03:'s06', s06:'s06', s07:'s08', s12:'s12', s08:'s08', s11:'s11' },
  'nina@example.test': { s04:'s04', s01:'s06', s02:'s06', s03:'s06', s06:'s06', s07:'s08', s12:'s12', s08:'s08', s11:'s11' },
  'olga@example.test': { s04:'s04', s01:'s07', s02:'s07', s03:'s03', s06:'s08', s07:'s07', s12:'s12', s08:'s08', s11:'s11' },
  'leon@example.test': { s04:'s04', s01:'s07', s02:'s07', s03:'s07', s06:'s06', s07:'s07', s12:'s12', s08:'s08', s11:'s11' },
};

test('every screen x every demo session lands where the map says; the bar never grants a role', () => {
  for (const [who, row] of Object.entries(expected)) for (const id of ids) {
    const sim = new Simulation();
    if (who !== 'guest') sim.selectAccount(who);
    assert.equal(sim.route(id), row[id], `${who} → ${id}`);
    assert.equal(sim.getSnapshot().active, row[id], `${who} → ${id} (active)`);
  }
});

test('guest at a protected screen keeps that screen as the login target, then lands there after sign-in', async () => {
  for (const [id, email, landing] of [['s06','tomasz@example.test','s06'],['s07','olga@example.test','s07'],['s03','ada@example.test','s03'],['s07','ada@example.test','s08']] as const) {
    const sim = new Simulation();
    assert.equal(sim.route(id), 's01');
    assert.equal(sim.getSnapshot().returnTo, SCREENS.find(screen => screen.id === id)!.path);
    sim.setHold(true); const pending = sim.login(email, 'MentioDemo!'); sim.finishRequest(); await pending;
    assert.equal(sim.getSnapshot().active, landing, `${id} via ${email}`);
  }
});

test('expired, forged, legacy and orphan cookies never open protected screens; verification failure gives s11', () => {
  for (const cookie of ['expired','forged','legacy','orphan'] as const) for (const id of ['s03','s06','s07'] as const) {
    const sim = new Simulation(); sim.selectAccount('leon@example.test'); sim.setCookie(cookie);
    assert.equal(sim.route(id), 's01', `${cookie} → ${id}`);
  }
  for (const id of ['s01','s02','s03','s06','s07'] as const) {
    const sim = new Simulation(); sim.selectAccount('leon@example.test'); sim.setInfrastructure(true);
    assert.equal(sim.route(id), 's11', id);
    assert.equal(sim.getSnapshot().retry, id);
  }
  const sim = new Simulation(); sim.selectAccount('leon@example.test'); sim.setInfrastructure(true);
  for (const id of ['s04','s12','s08'] as const) assert.equal(sim.route(id), id, `public ${id} during failure`);
});

test('every product link in the prototype points at an active map ID, and the approved edges exist', () => {
  const source = readFileSync(new URL('./main.tsx', import.meta.url), 'utf8');
  const targets = [...source.matchAll(/href[:=]\s*[{'"`]*#(s\d\d)/g)].map(match => match[1]);
  assert.ok(targets.length >= 10);
  for (const target of targets) assert.ok(isScreen(target), `link to retired or unknown ${target}`);
  for (const retired of ['s05','s09','s10']) assert.ok(!source.includes(`#${retired}`), retired);
  // s04 → s01/s02, s01 → s02/s12, s02 → s01, s12 → s01, s03/s07/s08/s11 → s04, panel nav → s06/s07.
  for (const target of ['s01','s02','s04','s06','s07','s12']) assert.ok(targets.includes(target), `missing link to ${target}`);
});
