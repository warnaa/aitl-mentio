import { Simulation, type Outcome } from './simulation.ts';
import { STATES, type StateId } from './states.ts';
import type { ScreenId } from './model';
export interface Recipe { screen: ScreenId; submit?: 'login' | 'register' | 'enroll' | 'logout'; fill?: boolean; email?: string }
/** Prepare fixtures, then let actual DS forms/actions run. A state name alone is never a fake result. */
export function prepareState(sim: Simulation, id: StateId): Recipe {
  const entry = STATES.find(state => state.id === id);
  if (!entry) throw new Error('Unknown state');
  sim.reset();
  const n = Number(id.slice(-2));
  const recipe: Recipe = { screen: entry.screen };
  if (entry.screen === 's01' || entry.screen === 's02') {
    const login = entry.screen === 's01';
    if ((login && n === 10) || (!login && n === 11)) sim.selectAccount('tomasz@example.test');
    else if (login && n === 11) {
      sim.selectAccount('tomasz@example.test'); sim.route('s06'); sim.setCookie('expired'); recipe.screen = sim.loseSession('s06');
    } else if ((!login && n === 12) || n === 1) { if (!login && n === 12) sim.setMentorRegistration(true); }
    else {
      recipe.fill = n !== 3; recipe.email = login ? 'ada@example.test' : 'nowa@example.test'; recipe.submit = login ? 'login' : 'register';
      if (n === 2) sim.setHold(true);
      const outcome: Outcome | undefined = n === 4 ? login ? 'credentials' : 'conflict' : n === 5 ? 'limit' : n === 6 ? 'offline' : n === 7 ? 'server' : !login && n === 8 ? 'lost-response' : undefined;
      if (outcome) sim.setOutcome(outcome);
      if ((login && n === 9) || (!login && n === 10)) { recipe.email = login ? 'leon@example.test' : 'nowa@example.test'; sim.setReturnTo('//outside.example.test'); }
    }
  } else if (entry.screen === 's03') {
    if (n !== 7) sim.selectAccount(n === 6 ? 'tomasz@example.test' : 'ada@example.test');
    if ([2,3,4,5].includes(n)) recipe.submit = 'enroll';
    if (n === 2) sim.setHold(true);
    if (n === 3) sim.setOutcome('offline');
    if (n === 5) sim.setOutcome('expire-after');
  } else if (entry.screen === 's04') {
    if (n >= 2 && n <= 6) sim.selectAccount('ada@example.test');
    if (n === 3) sim.setCookie('legacy');
    if ([4,5,6].includes(n)) recipe.submit = 'logout';
    if (n === 4) sim.setHold(true);
    if (n === 5) sim.setOutcome('server');
    if (n === 7) sim.setInfrastructure(true);
  } else if (entry.screen === 's06') {
    sim.selectAccount(n === 2 ? 'nina@example.test' : 'tomasz@example.test');
    sim.setRead('s06',n === 3 ? 'loading' : n === 4 ? 'error' : 'data');
  } else if (entry.screen === 's07') {
    sim.selectAccount('olga@example.test'); sim.setRead('s07', n === 2 ? 'empty' : n === 3 ? 'error' : n === 4 ? 'loading' : 'data');
  } else if (entry.screen === 's08') { sim.selectAccount('ada@example.test'); recipe.screen = 's07'; }
  else if (entry.screen === 's11') { sim.selectAccount('tomasz@example.test'); sim.setInfrastructure(true); recipe.screen = 's06'; }
  return recipe;
}
