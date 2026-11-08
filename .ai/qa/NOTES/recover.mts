import { readFile } from 'node:fs/promises';
import { SessionNote, Notification, entities, MikroORM } from '@devmentor/db';
import { runAgentBrowser } from '../../../tests/integration/agent-browser';
const descriptor = JSON.parse(await readFile('.ai/qa/test-env.json', 'utf8'));
const { base, bookingId } = JSON.parse(await readFile('.ai/qa/test-env-runtime/notes-fixture.json', 'utf8'));
const orm = await MikroORM.init({ entities, clientUrl: descriptor.services[0].url }); await orm.connect();
const em = orm.em.fork();
try {
 const before = await em.findOneOrFail(SessionNote, { booking: bookingId });
 const snapshot = { body: before.body, revision: before.revision, sentAt: before.sentAt?.toISOString() };
 await em.nativeDelete(Notification, { booking: bookingId, kind: 'note_awaiting_approval' });
 await runAgentBrowser('notes-mentor', 'open', `${base}/sessions/${bookingId}`);
 await runAgentBrowser('notes-mentor', 'find', 'role', 'button', 'click', '--name', 'Notify mentee');
 await runAgentBrowser('notes-mentor', 'wait', '--text', 'Notification requested.');
 const rows = await em.fork().find(Notification, { booking: bookingId, kind: 'note_awaiting_approval' });
 if(rows.length!==1) throw new Error('Replay did not repair exactly one row');
 const readAt = new Date('2026-11-07T17:00:00Z');
 await em.nativeUpdate(Notification, { id: rows[0]!.id }, { readAt });
 await runAgentBrowser('notes-mentor', 'find', 'role', 'button', 'click', '--name', 'Notify mentee');
 await runAgentBrowser('notes-mentor', 'wait', '--text', 'Notification requested.');
 const replayed = await em.fork().findOneOrFail(Notification, { id: rows[0]!.id });
 const after = await em.fork().findOneOrFail(SessionNote, { booking: bookingId });
 if(replayed.readAt?.toISOString()!==readAt.toISOString() || JSON.stringify(snapshot)!==JSON.stringify({body:after.body,revision:after.revision,sentAt:after.sentAt?.toISOString()})) throw new Error('Replay changed readAt or submission');
 console.log('Reload/Notify mentee repaired exactly one notification; repeat preserved readAt, sentAt, body and revision.');
 await runAgentBrowser('notes-mentee', 'open', `${base}/home`);
 console.log(await runAgentBrowser('notes-mentee','snapshot','-i'));
 console.log(await runAgentBrowser('notes-mentee','screenshot',`${process.cwd()}/.ai/qa/NOTES/mentee-notification-320.png`,'--full'));
} finally { await orm.close(); }
