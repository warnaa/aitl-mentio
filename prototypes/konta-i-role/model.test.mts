import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { adaptDesignSystem } from './ds-adapter.ts';
import { ACCOUNTS, SCREENS, startFor, slugFor, isScreen } from './model.ts';

test('screen IDs preserve the approved active map, without retired IDs', () => {
  assert.deepEqual(SCREENS.map(screen => screen.id).sort(), ['s01','s02','s03','s04','s06','s07','s08','s11','s12']);
  for (const screen of SCREENS) assert.equal(isScreen(screen.id), true);
  for (const retired of ['s05', 's09', 's10', 's99', '']) assert.equal(isScreen(retired), false);
});
test('role landing respects operator precedence; every existing account is a mentee', () => {
  assert.deepEqual(ACCOUNTS.map(startFor), ['s04', 's06', 's07', 's07', 's06', 's04']);
  assert.ok(ACCOUNTS.every(account => account.roles.includes('mentee')));
  assert.equal(slugFor('Łucja Przykładowa'), 'lucja-przykladowa');
});
test('build adapters localize actual DS source and fail when the expected contract changes', () => {
  const crud = readFileSync(new URL('../../packages/ui/src/backend/forms/CrudForm.tsx', import.meta.url), 'utf8');
  const converted = adaptDesignSystem(crud, '/backend/forms/CrudForm.tsx');
  assert.ok(converted?.includes('"Wymagane"'));
  assert.ok(converted?.includes('"Zapisywanie…"'));
  assert.ok(!converted?.includes('"Required"'));
  assert.throws(() => adaptDesignSystem('', '/backend/forms/CrudForm.tsx'));
  const panel = readFileSync(new URL('../../packages/ui/src/backend/layout/PanelShell.tsx', import.meta.url), 'utf8');
  assert.ok(adaptDesignSystem(panel, '/backend/layout/PanelShell.tsx')?.includes('const mainId = useId();'));
  assert.throws(() => adaptDesignSystem('', '/backend/layout/PanelShell.tsx'));
  assert.equal(adaptDesignSystem('unchanged', '/other.tsx'), undefined);
});
test('review engine is an exact copy of the supplied engine; comments have independent identity', () => {
  assert.equal(readFileSync(new URL('./review/prototype.js', import.meta.url), 'utf8'), readFileSync(new URL('../../lekcja-07/silnik-przegladu/prototype.js', import.meta.url), 'utf8'));
  assert.match(readFileSync(new URL('./review/comments.js', import.meta.url), 'utf8'), /prototypeId: 'konta-i-role'/);
});
