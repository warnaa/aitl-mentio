import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Simulation, safeReturnTo, EXPIRES, FRESH_EXPIRES } from './simulation.ts';
import { prepareState } from './scenarios.ts';
import { STATES } from './states.ts';
const pwd = 'MentioDemo!';
const fresh = {name:'Nowa osoba',email:'nowa@example.test',password:pwd};
async function action(sim: Simulation, run:()=>Promise<unknown>) { sim.setHold(true); const task=run(); sim.finishRequest(); return await task; }
const login = (sim:Simulation,email='ada@example.test') => action(sim,()=>sim.login(email,pwd));

test('safe returnTo rejects origin, encoded origin, control, whitespace and backslash tricks',()=>{
 for(const raw of [null,'','//evil.test','https://evil.test','/\\evil.test','%2F%2Fevil.test','/%2fexample.test','/%255Cevil','/a b','/a\nb','/x%0a','/'+ 'a'.repeat(2049),'/%zz']) assert.equal(safeReturnTo(raw),false,String(raw));
 for(const raw of ['/','/admin','/mentor/strona','/rezerwacja?termin=demo','/pomoc-z-logowaniem']) assert.equal(safeReturnTo(raw),true,raw);
});
test('absent and unsafe targets differ; safe returnTo is checked for role separately',async()=>{
 const sim=new Simulation(); await login(sim,'leon@example.test'); assert.equal(sim.getSnapshot().active,'s07');
 sim.reset(); sim.setReturnTo('//evil.test'); await login(sim,'leon@example.test'); assert.equal(sim.getSnapshot().active,'s04'); assert.ok(sim.getSnapshot().trace.includes('s01.09'));
 sim.reset(); sim.setReturnTo('/admin'); await login(sim); assert.equal(sim.getSnapshot().active,'s08');
 sim.reset(); sim.setReturnTo('/rezerwacja?termin=demo'); await login(sim); assert.equal(sim.getSnapshot().active,'s04'); assert.equal(sim.getSnapshot().handoff,'/rezerwacja?termin=demo');
});
test('guest target survives switching auth and recovery screens',()=>{
 const sim=new Simulation(); assert.equal(sim.route('s07'),'s01'); assert.equal(sim.getSnapshot().returnTo,'/admin');
 sim.route('s02');sim.route('s12');sim.route('s01');assert.equal(sim.getSnapshot().returnTo,'/admin');
});
test('all legal role sets and independent guards including signed-in mentor registration',()=>{
 const sim=new Simulation();
 for(const [email,start,mentor,admin] of [['ada@example.test','s04',false,false],['tomasz@example.test','s06',true,false],['olga@example.test','s07',false,true],['leon@example.test','s07',true,true]] as const){
  sim.reset();sim.selectAccount(email);assert.equal(sim.route('s01'),start);assert.equal(sim.route('s06'),mentor?'s06':'s08');assert.equal(sim.route('s07'),admin?'s07':'s08');
 }
 sim.reset();sim.selectAccount('olga@example.test');sim.setMentorRegistration(true);assert.equal(sim.route('s02'),'s03');
 sim.reset();sim.selectAccount('tomasz@example.test');sim.setMentorRegistration(true);assert.equal(sim.route('s02'),'s06');
});
test('cookie presence does not imply valid auth; infrastructure errors retain cookie and public access',()=>{
 const sim=new Simulation();sim.selectAccount('ada@example.test');sim.setCookie('legacy');assert.equal(sim.currentAccount(),null);assert.equal(sim.route('s04'),'s04');assert.equal(sim.getSnapshot().state.s04,'s04.03');assert.equal(sim.route('s01'),'s01');
 sim.setInfrastructure(true);assert.equal(sim.route('s01'),'s11');assert.equal(sim.getSnapshot().cookie,'legacy');assert.equal(sim.route('s04'),'s04');assert.equal(sim.getSnapshot().state.s04,'s04.07');
});
test('ordinary logout revokes only selected session; switching never recreates it',async()=>{
 const sim=new Simulation();sim.selectAccount('tomasz@example.test');sim.route('s06');await action(sim,()=>sim.logout());assert.equal(sim.getSnapshot().active,'s04');
 sim.selectSlot('B');assert.ok(sim.currentAccount());sim.selectSlot('A');assert.equal(sim.currentAccount(),null);
 sim.selectAccount('tomasz@example.test');assert.equal(sim.currentAccount(),null);await login(sim,'tomasz@example.test');assert.ok(sim.currentAccount());
});
test('failed logout does not revoke current session or clear cookie',async()=>{
 const sim=new Simulation();sim.selectAccount('ada@example.test');sim.setOutcome('server');const result=await action(sim,()=>sim.logout());
 assert.equal((result as {ok:boolean}).ok,false);assert.ok(sim.currentAccount());assert.equal(sim.getSnapshot().cookie,'valid');assert.equal(sim.getSnapshot().state.s04,'s04.05');
 await action(sim,()=>sim.logout());assert.equal(sim.getSnapshot().cookie,'none');
});
test('grant is invisible to old role snapshots; enrollment retains ID and deadline',async()=>{
 const sim=new Simulation();sim.selectAccount('ada@example.test');const before=structuredClone(sim.currentSession());
 sim.operator('grant');assert.deepEqual(sim.currentAccount()?.roles,['mentee']);sim.selectSlot('B');assert.deepEqual(sim.currentAccount()?.roles,['mentee']);sim.selectSlot('A');
 await action(sim,()=>sim.enroll());assert.deepEqual(sim.currentAccount()?.roles,['mentee','mentor']);assert.equal(sim.currentSession()?.id,before?.id);assert.equal(sim.currentSession()?.expires,EXPIRES);
 const after=structuredClone(sim.currentSession());sim.route('s03');assert.deepEqual(sim.currentSession(),after);assert.ok(sim.getSnapshot().trace.includes('s03.06'));
});
test('fresh credentials create 24h sessions; enrollment retains fresh or fixture deadline',async()=>{
 const sim=new Simulation();await login(sim);assert.equal(sim.currentSession()?.expires,FRESH_EXPIRES);
 await action(sim,()=>sim.enroll());assert.equal(sim.currentSession()?.expires,FRESH_EXPIRES);
 sim.reset();await action(sim,()=>sim.register(fresh));assert.equal(sim.currentSession()?.expires,FRESH_EXPIRES);
 assert.equal(Date.parse(FRESH_EXPIRES)-Date.parse('2026-11-01T11:00:00Z'),24*60*60*1000);
});
test('actual removal and reset invalidate A+B; absent removal is a no-op',()=>{
 for(const mode of ['remove','reset'] as const){const sim=new Simulation();sim.selectAccount('tomasz@example.test');sim.operator(mode);assert.equal(sim.currentAccount(),null);sim.selectSlot('B');assert.equal(sim.currentAccount(),null);}
 const sim=new Simulation();sim.selectAccount('ada@example.test');sim.operator('remove');assert.ok(sim.currentAccount());
});
test('expiry before/after enrollment commit differs; both require reauthentication without replay',async()=>{
 for(const outcome of ['expire-before','expire-after'] as const){const sim=new Simulation();sim.selectAccount('ada@example.test');sim.route('s03');sim.setOutcome(outcome);await action(sim,()=>sim.enroll());
 assert.equal(sim.getSnapshot().active,'s01');assert.equal(sim.getSnapshot().lostSession,true);assert.equal(sim.getSnapshot().returnTo,'/zostan-mentorem');assert.equal(sim.getSnapshot().accounts[0].roles.includes('mentor'),outcome==='expire-after');
 await login(sim);assert.equal(sim.getSnapshot().active,outcome==='expire-after'?'s06':'s03');assert.equal(sim.getSnapshot().accounts[0].roles.filter(r=>r==='mentor').length,outcome==='expire-after'?1:0);}
});
test('offline/500 writes nothing; lost response commits exactly once without creating session',async()=>{
 for(const outcome of ['offline','server','lost-response'] as const){const sim=new Simulation();sim.setOutcome(outcome);await action(sim,()=>sim.register(fresh));
 assert.equal(sim.getSnapshot().accounts.length,outcome==='lost-response'?7:6);assert.equal(sim.currentAccount(),null);assert.equal(sim.getSnapshot().cookie,'none');
 if(outcome==='lost-response'){const retry=await action(sim,()=>sim.register(fresh)) as {status:number};assert.equal(retry.status,409);assert.equal(sim.getSnapshot().accounts.length,7);sim.setReturnTo('/mentor/strona');await login(sim,fresh.email);assert.equal(sim.getSnapshot().active,'s08');}}
});
test('normalization and legacy/unknown/wrong-password errors do not take over accounts',async()=>{
 const sim=new Simulation();const result=await action(sim,()=>sim.register({...fresh,email:'  ADA@EXAMPLE.TEST  '})) as {status:number};assert.equal(result.status,409);assert.equal(sim.getSnapshot().accounts.length,6);
 for(const email of ['legacy@example.test','unknown@example.test']){const s=new Simulation();assert.deepEqual(await action(s,()=>s.login(email,pwd)),{ok:false,status:401,error:{code:'invalid_credentials',message:'Nieprawidłowy e-mail lub hasło'}});}
});
test('successful admission consumes budget and cannot reset it through logout',async()=>{
 const sim=new Simulation();for(let i=0;i<4;i++) await action(sim,()=>sim.login('ada@example.test','wrong'));await login(sim);assert.ok(sim.currentAccount());await action(sim,()=>sim.logout());
 const denied=await login(sim) as {status:number};assert.equal(denied.status,429);assert.equal(sim.getSnapshot().attempts['ada@example.test'].login,5);
 sim.clearLimits();assert.equal((await login(sim) as {status:number}).status,200);
});
test('paused duplicate and reset cannot double-create or complete a cancelled request',async()=>{
 const sim=new Simulation();sim.setHold(true);const pending=sim.register(fresh);assert.equal(sim.getSnapshot().pending,'register');
 assert.equal((await sim.register(fresh)).status,409);assert.equal(sim.getSnapshot().attempts[fresh.email].register,1);sim.reset();await pending;assert.equal(sim.getSnapshot().accounts.length,6);assert.equal(sim.currentAccount(),null);
});
test('reset/role removal during paused login cannot restore invalidated access',async()=>{
 const sim=new Simulation();sim.selectAccount('ada@example.test');sim.setHold(true);const pending=sim.login('ada@example.test',pwd);sim.operator('reset');sim.finishRequest();assert.equal((await pending).status,401);assert.equal(sim.currentAccount(),null);
});
test('registration uses the submitted mentor variant even if later review conditions change',async()=>{
 const sim=new Simulation();sim.setHold(true);const task=sim.register(fresh);sim.setMentorRegistration(true);sim.finishRequest();await task;
 assert.deepEqual(sim.currentAccount()?.roles,['mentee']);
});
test('all 48 scenario recipes drive model action paths; invalid forms are left to the real DS UI',async()=>{
 assert.equal(STATES.length,48);const seen=new Set<string>();
 for(const state of STATES){const sim=new Simulation();const recipe=prepareState(sim,state.id);sim.route(recipe.screen);
  if(recipe.submit && !['s01.03','s02.03'].includes(state.id)){const run=recipe.submit==='login'?()=>sim.login(recipe.email!,pwd):recipe.submit==='register'?()=>sim.register(fresh):recipe.submit==='enroll'?()=>sim.enroll():()=>sim.logout();await action(sim,run);}
  for(const id of sim.getSnapshot().trace) seen.add(id);
 }
 for(const state of STATES.filter(x=>!['s01.03','s02.03'].includes(x.id))) assert.ok(seen.has(state.id),state.id);
});
