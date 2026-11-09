import { expect, it } from 'vitest';
import { Booking, LockMode, Notification, SessionNote, User } from '@devmentor/db';
import { EventBus, RateLimiter, SessionNoteService, createLogger } from '@devmentor/core';
import type { NoteDto, NoteView } from '@devmentor/core';
import { bookingPersona } from './fixtures/booking';
import { confirmBooking, listNotifications, withSecondMentorBooking } from './fixtures/notification';
import { withPaymentFixture, type PaymentFixture } from './fixtures/payment';
import { closeAgentBrowser, runAgentBrowser, signInAs, expectFitsMobile, integrationArtifactsDirectory } from './agent-browser';
import { resolve } from 'node:path';

const url = (f: PaymentFixture) => `${f.base}/api/notes/${f.booking.id}`;
async function request(f: PaymentFixture, headers: Record<string, string>, method = 'GET', body?: unknown, send = false) {
  const response = await fetch(url(f) + (send ? '/send' : ''), { method, headers, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const payload = await response.json() as { ok: boolean; data: NoteDto & NoteView; error?: { code: string; message: string; fieldErrors?: object } };
  expect(response.headers.get('cache-control')).toBe('private, no-store');
  return { status: response.status, payload, response };
}
async function answer(f: PaymentFixture) {
  await f.em.fork().nativeUpdate(Booking, { id: f.booking.id }, { startsAt: new Date(Date.now() - 30 * 60_000), writtenAnswer: 'Synthetic written answer.', writtenAnswerAt: new Date('2026-11-07T12:00:00Z') });
}
const save = (f: PaymentFixture, body: string, expectedRevision: number | null) => request(f, f.mentor, 'PUT', { body, expectedRevision });
const send = (f: PaymentFixture, revision: number, version = 1) => request(f, f.mentor, 'POST', { revision, version }, true);
const readNote = async (f: PaymentFixture) => (await request(f, f.first)).payload.data.current;

it('NOTES-001 saves a private draft and submits exactly its saved revision, readable by both parties with one notification', async () => {
  await withPaymentFixture('n-001', async f => {
    await confirmBooking(f); await answer(f);
    expect((await request(f, f.first)).payload.data).toEqual({ current: null, history: [] });
    const first = await save(f, '  private\r\n<script>plain text</script>  ', null);
    expect(first.status).toBe(200);
    expect(first.payload.data).toMatchObject({ revision: 1, version: 1, body: 'private\n<script>plain text</script>', status: 'draft', private: true });
    expect(await readNote(f)).toEqual(first.payload.data);
    expect((await save(f, 'exact saved body', 1)).payload.data.revision).toBe(2);
    expect((await send(f, 1)).status).toBe(409);
    const sent = await send(f, 2);
    expect(sent.status).toBe(200);
    expect(sent.payload.data).toMatchObject({ revision: 2, body: 'exact saved body', status: 'awaiting_approval' });
    expect(await readNote(f)).toEqual(sent.payload.data);
    expect((await send(f, 2)).payload.data).toEqual(sent.payload.data);
    expect((await save(f, 'cannot change sent body', 2)).status).toBe(409);
    expect((await listNotifications(f, f.first)).body.data.items.filter(n => n.kind === 'note_awaiting_approval')).toHaveLength(1);
    const publicProfile = await fetch(`${f.base}/api/mentors/${f.slug}`);
    expect(await publicProfile.text()).not.toContain('exact saved body');
    expect(JSON.stringify((await listNotifications(f, f.first)).body)).not.toContain('exact saved body');
    for (const headers of [f.first, f.mentor]) {
      const response = await fetch(`${f.base}/api/bookings?role=${headers === f.mentor ? 'mentor' : 'mentee'}`, { headers });
      expect(await response.text()).not.toContain('exact saved body');
    }
  });
});

it('NOTES-002 denies outsiders and mentee writes and rejects invalid or premature drafts without disclosure', async () => {
  await withPaymentFixture('n-002', async f => {
    expect((await request(f, f.mentor)).status).toBe(404);
    await confirmBooking(f);
    expect((await save(f, 'answer required', null)).status).toBe(409);
    await answer(f);
    expect((await request(f, { 'x-devmentor-request': '1' })).status).toBe(401);
    for (const [method, body, isSend] of [['PUT', { body: 'x', expectedRevision: null }, false], ['POST', { version: 1, revision: 1 }, true]] as const) {
      expect((await request(f, f.first, method, body, isSend)).status).toBe(403);
      expect((await request(f, { cookie: f.mentor.cookie!, 'content-type': 'application/json' }, method, body, isSend)).status).toBe(403);
      expect((await request(f, f.second, method, body, isSend)).status).toBe(404);
    }
    for (const body of [' ', 'x\u0000', 'x'.repeat(20001)]) expect((await save(f, body, null)).status).toBe(422);
    const invalid = await fetch(`${f.base}/api/notes/not-a-uuid`, { headers: f.mentor });
    expect(invalid.status).toBe(422);
    const operator = await bookingPersona(f.base, 'mock-operator');
    expect((await request(f, operator)).status).toBe(404);
    expect((await request(f, operator, 'PUT', { body: 'operator denied', expectedRevision: null })).status).toBe(404);
    expect((await request(f, operator, 'POST', { version: 1, revision: 1 }, true)).status).toBe(404);
    await withSecondMentorBooking(f, async () => expect((await request(f, f.second)).status).toBe(404));
    const saved = await save(f, 'kept private', null);
    expect(saved.status).toBe(200);
    expect((await save(f, 'stale create', null)).status).toBe(409);
    expect((await save(f, 'stale edit', 99)).status).toBe(409);
    await f.em.fork().nativeUpdate(Booking, { id: f.booking.id }, { status: 'cancelled' });
    expect((await save(f, 'cancelled', 1)).status).toBe(404);
    expect((await request(f, f.mentor)).status).toBe(404);
    expect((await f.em.fork().findOneOrFail(SessionNote, { booking: f.booking.id })).body).toBe('kept private');
  });
});

it('NOTES-003 serializes concurrent first saves and save versus send without lost edits or mutable submissions', async () => {
  await withPaymentFixture('n-003', async f => {
    await confirmBooking(f); await answer(f);
    const created = await Promise.all([save(f, 'first contender', null), save(f, 'second contender', null)]);
    expect(created.map(r => r.status).sort()).toEqual([200, 409]);
    expect(await f.em.fork().count(SessionNote, { booking: f.booking.id })).toBe(1);
    const first = await readNote(f);
    const raced = await Promise.all([save(f, 'new saved revision', 1), send(f, 1)]);
    expect(raced.map(r => r.status).sort()).toEqual([200, 409]);
    const current = await readNote(f);
    if (current!.status === 'awaiting_approval') expect(current!.body).toBe(first!.body);
    else {
      expect(current).toMatchObject({ status: 'draft', revision: 2, body: 'new saved revision' });
      expect((await send(f, 2)).status).toBe(200);
    }
    const immutable = await readNote(f);
    expect((await save(f, 'not allowed', immutable!.revision)).status).toBe(409);
    expect(await readNote(f)).toEqual(immutable);
  });
});

it('NOTES-004 recovers a committed send after subscriber failure through the reloaded awaiting Notify mentee action', async () => {
  await withPaymentFixture('n-004', async f => {
    await confirmBooking(f); await answer(f);
    await save(f, 'Subscriber failure must not lose this private note.', null);
    const logger = createLogger();
    const eventBus = new EventBus({ logger });
    eventBus.on('notes.note.sent', () => { throw new Error('Synthetic notification subscriber unavailable'); });
    const clock = { now: () => new Date('2026-11-07T15:00:00Z') };
    const service = new SessionNoteService({ em: f.em.fork(), session: Promise.resolve({ userId: f.mentorId, roles: ['mentor'] }), clock, rateLimiter: new RateLimiter({ em: f.em.fork(), clock, logger }), eventBus });
    const sent = await service.send(f.booking.id, { version: 1, revision: 1 });
    expect(sent.status).toBe('awaiting_approval');
    expect(await f.em.fork().count(Notification, { booking: f.booking.id, kind: 'note_awaiting_approval' })).toBe(0);
    const browser = `notes-repair-${process.pid}`;
    try {
      const mentor = await f.em.fork().findOneOrFail(User, { id: f.mentorId });
      await signInAs(browser, f.base, mentor.githubLogin!);
      await runAgentBrowser(browser, 'open', `${f.base}/sessions/${f.booking.id}`);
      const snapshot = await runAgentBrowser(browser, 'snapshot', '-i');
      expect(snapshot).toContain('button "Notify mentee"');
      expect(snapshot).not.toContain('textbox "Session note"');
      await runAgentBrowser(browser, 'find', 'role', 'button', 'click', '--name', 'Notify mentee');
      await runAgentBrowser(browser, 'wait', '--text', 'Notification requested.');
      const row = await f.em.fork().findOneOrFail(Notification, { booking: f.booking.id, kind: 'note_awaiting_approval' });
      const readAt = new Date('2026-11-07T16:00:00Z');
      await f.em.fork().nativeUpdate(Notification, { id: row.id }, { readAt });
      expect((await send(f, 1)).payload.data).toEqual(sent);
      expect((await f.em.fork().findOneOrFail(Notification, { id: row.id })).readAt).toEqual(readAt);
      expect(await f.em.fork().count(Notification, { booking: f.booking.id, kind: 'note_awaiting_approval' })).toBe(1);
    } finally { await closeAgentBrowser(browser); }
  });
});

it('NOTES-005 bounds account reads and writes after party authorization', async () => {
  await withPaymentFixture('n-005', async f => {
    await confirmBooking(f); await answer(f);
    for (let i = 0; i < 30; i++) expect((await save(f, `revision ${i}`, i === 0 ? null : i)).status).toBe(200);
    const limitedSave = await save(f, 'too many', 30);
    expect(limitedSave.status).toBe(429);
    expect(limitedSave.response.headers.get('retry-after')).toBeTruthy();
    expect((await request(f, f.second)).status).toBe(404);
    for (let i = 0; i < 120; i++) expect((await request(f, f.first)).status).toBe(200);
    expect((await request(f, f.first)).status).toBe(429);
    for (let i = 0; i < 30; i++) expect((await send(f, 30)).status).toBe(200);
    expect((await send(f, 30)).status).toBe(429);
  });
});

it('NOTES-006 mentor saves and sends through the UI and the ended mentee refreshes an immutable read-only note at desktop and 320px', async () => {
  await withPaymentFixture('n-006', async f => {
    await confirmBooking(f); await answer(f);
    const browsers = [`notes-mentor-${process.pid}`, `notes-mentee-${process.pid}`, `notes-other-${process.pid}`];
    const logins = await Promise.all([f.mentorId, f.firstId, f.secondId].map(id => f.em.fork().findOneOrFail(User, { id })));
    try {
      for (let i = 0; i < browsers.length; i++) {
        await signInAs(browsers[i]!, f.base, logins[i]!.githubLogin!);
        await runAgentBrowser(browsers[i]!, 'open', `${f.base}/sessions/${f.booking.id}`);
      }
      expect(await runAgentBrowser(browsers[2]!, 'snapshot', '-i')).toContain('heading "404"');
      const mentor = browsers[0]!, mentee = browsers[1]!;
      expect(await runAgentBrowser(mentee, 'snapshot')).toContain('No session note yet');
      const body = `Long plain text <script>still text</script>\n${'x'.repeat(19000)}`;
      await runAgentBrowser(mentor, 'find', 'label', 'Session note', 'fill', body);
      await runAgentBrowser(mentor, 'press', 'Control+Enter');
      await runAgentBrowser(mentor, 'wait', '--text', 'Session note saved. Review it before sending.');
      await runAgentBrowser(mentee, 'find', 'role', 'button', 'click', '--name', 'Refresh note');
      expect(await runAgentBrowser(mentee, 'snapshot')).toContain('The mentor has not sent this note for approval yet.');
      expect(await runAgentBrowser(mentee, 'snapshot', '-i')).not.toContain('textbox');
      await runAgentBrowser(mentor, 'find', 'role', 'button', 'click', '--name', 'Send for approval');
      await runAgentBrowser(mentor, 'wait', '--text', 'Notification requested.');
      await runAgentBrowser(mentee, 'find', 'role', 'button', 'click', '--name', 'Refresh note');
      await runAgentBrowser(mentee, 'wait', '--text', 'Awaiting your approval');
      const menteeControls = await runAgentBrowser(mentee, 'snapshot', '-i');
      expect(menteeControls).not.toContain('textbox');
      expect(menteeControls).toContain('button "Approve the full note"');
      expect(await runAgentBrowser(mentee, 'eval', `document.querySelector('[aria-label="Private session note"]')?.querySelector('script') === null`)).toBe('true');
      expect(await readNote(f)).toMatchObject({ body, status: 'awaiting_approval' });
      await runAgentBrowser(mentee, 'screenshot', resolve(integrationArtifactsDirectory, 'notes-awaiting-desktop.png'), '--full');
      await expectFitsMobile(mentor, 'notes-mentor-awaiting');
      await expectFitsMobile(mentee, 'notes-mentee-awaiting');
    } finally { for (const browser of browsers) await closeAgentBrowser(browser); }
  });
});

it('NOTES-008 keeps the session readable and retries a temporarily unavailable note without leaking driver text', async () => {
  await withPaymentFixture('n-008', async f => {
    await confirmBooking(f); await answer(f);
    const browser = `notes-errors-${process.pid}`;
    let renamed = false;
    let trigger = false;
    try {
      const mentor = await f.em.fork().findOneOrFail(User, { id: f.mentorId });
      await signInAs(browser, f.base, mentor.githubLogin!);
      await f.em.execute('alter table session_notes rename to unavailable_session_notes'); renamed = true;
      await runAgentBrowser(browser, 'open', `${f.base}/sessions/${f.booking.id}`);
      expect(await runAgentBrowser(browser, 'snapshot')).toContain('This session has ended');
      expect(await runAgentBrowser(browser, 'snapshot')).toContain('The session note could not be loaded. Try again.');
      await f.em.execute('alter table unavailable_session_notes rename to session_notes'); renamed = false;
      await runAgentBrowser(browser, 'find', 'role', 'button', 'click', '--name', 'Retry');
      await runAgentBrowser(browser, 'wait', '--fn', `!document.querySelector('[role="alert"]')`);
      await runAgentBrowser(browser, 'find', 'label', 'Session note', 'fill', 'Original retryable note');
      const blocker = f.em.fork();
      await blocker.begin();
      try {
        await blocker.findOneOrFail(Booking, { id: f.booking.id }, { lockMode: LockMode.PESSIMISTIC_WRITE });
        await runAgentBrowser(browser, 'press', 'Control+Enter');
        await runAgentBrowser(browser, 'wait', '--text', 'Saving');
        const loading = await runAgentBrowser(browser, 'snapshot', '-i');
        expect(loading).toContain('button "Saving');
        expect(loading).toContain('button "Refresh note" [disabled');
        await runAgentBrowser(browser, 'screenshot', resolve(integrationArtifactsDirectory, 'notes-saving-desktop.png'), '--full');
        await expectFitsMobile(browser, 'notes-saving');
      } finally { await blocker.rollback(); }
      await runAgentBrowser(browser, 'wait', '--text', 'Session note saved. Review it before sending.');
      await f.em.execute(`create function notes_fixture_failure() returns trigger language plpgsql as $$ begin raise exception 'private row: %', NEW.body; end; $$`);
      await f.em.execute('create trigger notes_fixture_failure before update on session_notes for each row execute function notes_fixture_failure()'); trigger = true;
      const privateText = 'private-marker-must-not-be-in-driver-log';
      await runAgentBrowser(browser, 'find', 'label', 'Session note', 'fill', privateText);
      await runAgentBrowser(browser, 'press', 'Control+Enter');
      await runAgentBrowser(browser, 'wait', '--text', 'Something went wrong');
      expect(await runAgentBrowser(browser, 'snapshot', '-i')).toContain(privateText);
      expect((await readNote(f))!.body).toBe('Original retryable note');
      const { readFile } = await import('node:fs/promises');
      const { APP_LOG_PATH } = await import('./mail');
      expect(await readFile(APP_LOG_PATH, 'utf8')).not.toContain(privateText);
      await runAgentBrowser(browser, 'screenshot', resolve(integrationArtifactsDirectory, 'notes-storage-error-desktop.png'), '--full');
      await expectFitsMobile(browser, 'notes-storage-error');
    } finally {
      if (renamed) await f.em.execute('alter table unavailable_session_notes rename to session_notes');
      if (trigger) await f.em.execute('drop trigger notes_fixture_failure on session_notes');
      await f.em.execute('drop function if exists notes_fixture_failure()');
      await closeAgentBrowser(browser);
    }
  });
});

const decide = (f: PaymentFixture, kind: 'approve' | 'decline', body: unknown, headers: Record<string, string> = f.first) => fetch(`${url(f)}/${kind}`, { method: 'POST', headers, body: JSON.stringify(body) }).then(async response => ({ status: response.status, payload: await response.json() as { ok: boolean; data: NoteDto; error?: { fieldErrors?: Record<string, string[]> } } }));
const redraft = (f: PaymentFixture, body: string, expectedRevision: number, expectedVersion: number) => request(f, f.mentor, 'PUT', { body, expectedRevision, expectedVersion });

it('NOTES-011 approves one sent version as a private record both parties keep, absent from every other surface, and freezes the answer', async () => {
  await withPaymentFixture('n-011', async f => {
    await confirmBooking(f); await answer(f);
    const marker = 'approved-private-note-marker';
    await save(f, marker, null);
    expect((await decide(f, 'approve', { version: 1 })).status).toBe(409);
    await send(f, 1);
    expect((await decide(f, 'approve', { version: 1 }, f.mentor)).status).toBe(403);
    expect((await decide(f, 'approve', { version: 1 }, f.second)).status).toBe(404);
    const approved = await decide(f, 'approve', { version: 1 });
    expect(approved.status).toBe(200);
    expect(approved.payload.data).toMatchObject({ status: 'approved', private: true, declineComment: null });
    expect((await decide(f, 'approve', { version: 1 })).payload.data).toEqual(approved.payload.data);
    expect((await decide(f, 'decline', { version: 1, comment: 'too late' })).status).toBe(409);
    expect((await save(f, 'edited after approval', 1)).status).toBe(409);
    for (const headers of [f.first, f.mentor]) expect((await request(f, headers)).payload.data.current).toEqual(approved.payload.data);
    expect((await request(f, f.second)).status).toBe(404);
    const operator = await bookingPersona(f.base, 'mock-operator');
    expect((await request(f, operator)).status).toBe(404);
    for (const path of [`/api/mentors/${f.slug}`, '/api/mentors', `/mentors/${f.slug}`]) {
      const response = await fetch(f.base + path);
      expect(response.status, path).toBeLessThan(500);
      expect(await response.text()).not.toContain(marker);
    }
    for (const headers of [f.first, f.mentor]) {
      const response = await fetch(`${f.base}/api/bookings?role=${headers === f.mentor ? 'mentor' : 'mentee'}`, { headers });
      expect(await response.text()).not.toContain(marker);
    }
    const mentorNotes = (await listNotifications(f, f.mentor)).body;
    expect(mentorNotes.data.items.filter(n => n.kind === 'note_approved')).toHaveLength(1);
    expect(JSON.stringify(mentorNotes)).not.toContain(marker);
    const frozen = await fetch(`${f.base}/api/sessions/${f.booking.id}/answer`, { method: 'PUT', headers: f.mentor, body: JSON.stringify({ body: 'Replaced answer.' }) });
    expect(frozen.status).toBe(409);
    expect((await f.em.fork().findOneOrFail(Booking, { id: f.booking.id })).writtenAnswer).toBe('Synthetic written answer.');
  });
});

it('NOTES-012 requires a decline comment, redrafts as new versions, notifies per version and counts declines for the operator without text', async () => {
  await withPaymentFixture('n-012', async f => {
    await confirmBooking(f); await answer(f);
    await save(f, 'first body', null); await send(f, 1);
    const blank = await decide(f, 'decline', { version: 1, comment: '   ' });
    expect(blank.status).toBe(422);
    expect(blank.payload.error!.fieldErrors!.comment).toBeTruthy();
    expect((await readNote(f))!.status).toBe('awaiting_approval');
    const comment = 'private-decline-comment-marker';
    expect((await decide(f, 'decline', { version: 1, comment })).payload.data).toMatchObject({ status: 'declined', declineComment: comment });
    expect(await readNote(f)).toMatchObject({ status: 'declined', declineComment: comment, body: 'first body' });
    expect((await save(f, 'no version given', 1)).status).toBe(409);
    expect((await redraft(f, 'stale tab', 1, 2)).status).toBe(409);
    expect((await redraft(f, 'second body', 1, 1)).payload.data).toMatchObject({ version: 2, revision: 1, status: 'draft' });
    expect((await redraft(f, 'second tab', 1, 1)).status).toBe(409);
    expect((await decide(f, 'decline', { version: 1, comment })).status).toBe(409);
    await send(f, 1, 2);
    expect((await listNotifications(f, f.first)).body.data.items.filter(n => n.kind === 'note_awaiting_approval')).toHaveLength(2);
    await decide(f, 'decline', { version: 2, comment: 'still missing' });
    const view = (await request(f, f.mentor)).payload.data;
    expect(view.current).toMatchObject({ version: 2, status: 'declined' });
    expect(view.history).toEqual([expect.objectContaining({ version: 1, status: 'declined', declineComment: comment, body: 'first body' })]);
    expect((await listNotifications(f, f.mentor)).body.data.items.filter(n => n.kind === 'note_declined')).toHaveLength(2);
    const browser = `notes-operator-${process.pid}`;
    try {
      await signInAs(browser, f.base, 'mock-operator');
      await runAgentBrowser(browser, 'open', `${f.base}/admin/sessions`);
      await runAgentBrowser(browser, 'wait', '--text', 'Private note declines');
      const html = await runAgentBrowser(browser, 'get', 'html', 'main');
      expect(html).toMatch(/>2<\/td>/);
      expect(html).not.toContain(comment);
      expect(html).not.toContain('first body');
      await runAgentBrowser(browser, 'screenshot', resolve(integrationArtifactsDirectory, 'notes-operator-declines-desktop.png'), '--full');
      await expectFitsMobile(browser, 'notes-operator-declines');
    } finally { await closeAgentBrowser(browser); }
    expect((await fetch(`${f.base}/admin/sessions`, { headers: f.first, redirect: 'manual' })).status).toBeGreaterThanOrEqual(300);
  });
});

it('NOTES-013 serializes approve against decline and approval against an answer replacement', async () => {
  await withPaymentFixture('n-013', async f => {
    await confirmBooking(f); await answer(f);
    await save(f, 'contended', null); await send(f, 1);
    const raced = await Promise.all([decide(f, 'approve', { version: 1 }), decide(f, 'decline', { version: 1, comment: 'contender' }), fetch(`${f.base}/api/sessions/${f.booking.id}/answer`, { method: 'PUT', headers: f.mentor, body: JSON.stringify({ body: 'Racing answer.' }) })]);
    expect([raced[0].status, raced[1].status].sort()).toEqual([200, 409]);
    const note = await readNote(f);
    expect(note!.status).toBe(raced[0].status === 200 ? 'approved' : 'declined');
    expect(await f.em.fork().count(SessionNote, { booking: f.booking.id })).toBe(1);
    const answerStored = (await f.em.fork().findOneOrFail(Booking, { id: f.booking.id })).writtenAnswer;
    if (note!.status === 'approved' && raced[2].status === 409) expect(answerStored).toBe('Synthetic written answer.');
    else expect(raced[2].status).toBe(200);
  });
});

it('NOTES-014 mentee declines and approves through the UI, mentor redrafts, at desktop and 320px', async () => {
  await withPaymentFixture('n-014', async f => {
    await confirmBooking(f); await answer(f);
    await save(f, 'Browser first version', null); await send(f, 1);
    const browsers = [`notes-d-mentor-${process.pid}`, `notes-d-mentee-${process.pid}`];
    const logins = await Promise.all([f.mentorId, f.firstId].map(id => f.em.fork().findOneOrFail(User, { id })));
    try {
      for (let i = 0; i < browsers.length; i++) {
        await signInAs(browsers[i]!, f.base, logins[i]!.githubLogin!);
        await runAgentBrowser(browsers[i]!, 'open', `${f.base}/sessions/${f.booking.id}`);
      }
      const [mentor, mentee] = browsers as [string, string];
      await runAgentBrowser(mentee, 'find', 'role', 'button', 'click', '--name', 'Request changes');
      expect(await runAgentBrowser(mentee, 'snapshot', '-i')).toMatch(/button "Send requested changes".*disabled/);
      await expectFitsMobile(mentee, 'notes-decline-form');
      await runAgentBrowser(mentee, 'find', 'role', 'textbox', 'fill', 'Please add the error case.');
      await runAgentBrowser(mentee, 'find', 'role', 'button', 'click', '--name', 'Send requested changes');
      await runAgentBrowser(mentee, 'wait', '--text', 'Your requested changes were sent.');
      await runAgentBrowser(mentor, 'find', 'role', 'button', 'click', '--name', 'Refresh note');
      await runAgentBrowser(mentor, 'wait', '--text', 'Please add the error case.');
      await runAgentBrowser(mentor, 'find', 'role', 'button', 'click', '--name', 'Redraft');
      await runAgentBrowser(mentor, 'wait', '--text', 'Revised private note');
      await expectFitsMobile(mentor, 'notes-redraft');
      await runAgentBrowser(mentor, 'screenshot', resolve(integrationArtifactsDirectory, 'notes-redraft-desktop.png'), '--full');
      await runAgentBrowser(mentor, 'find', 'label', 'Revised private note', 'fill', 'Browser second version');
      await runAgentBrowser(mentor, 'press', 'Control+Enter');
      await runAgentBrowser(mentor, 'wait', '--text', 'Session note saved. Review it before sending.');
      await runAgentBrowser(mentor, 'find', 'role', 'button', 'click', '--name', 'Send for approval');
      await runAgentBrowser(mentor, 'wait', '--text', 'Notification requested.');
      await runAgentBrowser(mentee, 'find', 'role', 'button', 'click', '--name', 'Refresh note');
      await runAgentBrowser(mentee, 'wait', '--text', 'Browser second version');
      await runAgentBrowser(mentee, 'find', 'role', 'button', 'click', '--name', 'Approve the full note');
      await runAgentBrowser(mentee, 'wait', '--text', 'nothing is published');
      await runAgentBrowser(mentee, 'screenshot', resolve(integrationArtifactsDirectory, 'notes-approved-desktop.png'), '--full');
      await expectFitsMobile(mentee, 'notes-approved');
      await runAgentBrowser(mentor, 'open', `${f.base}/sessions/${f.booking.id}`);
      await runAgentBrowser(mentor, 'wait', '--text', 'nothing is published');
      const snapshot = await runAgentBrowser(mentor, 'snapshot', '-i');
      expect(snapshot).not.toContain('textbox');
      expect(await runAgentBrowser(mentor, 'snapshot')).toContain('so this written answer is final');
      expect(await readNote(f)).toMatchObject({ version: 2, status: 'approved', body: 'Browser second version' });
    } finally { for (const browser of browsers) await closeAgentBrowser(browser); }
  });
});
