import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { expect, it } from 'vitest';
import { integrationChildEnvironment } from './environment';
import { runNpm } from './npm';

it('NOTES-007 migrates session notes up down up with restrictive lifecycle constraints and preserved existing notifications', async () => {
  const postgres = await new PostgreSqlContainer('postgres:17-alpine').withDatabase('notes_migration').withUsername('devmentor').withPassword('devmentor').start();
  const environment = integrationChildEnvironment(postgres.getConnectionUri());
  const psql = (sql: string) => postgres.exec(['psql', '-X', '-q', '-t', '-A', '-v', 'ON_ERROR_STOP=1', '-U', 'devmentor', '-d', 'notes_migration', '-c', sql]);
  const query = async (sql: string) => { const r = await psql(sql); expect(r.exitCode, r.stderr).toBe(0); return JSON.parse(r.stdout.trim() || 'null'); };
  try {
    await runNpm(['run', 'db:migrate'], environment);
    expect(await query(`select json_agg(conname) from pg_constraint where conrelid = 'session_notes'::regclass`)).toEqual(expect.arrayContaining(['session_notes_booking_version_unique', 'session_notes_body_check', 'session_notes_state_check', 'session_notes_revision_check', 'session_notes_version_check', 'session_notes_booking_id_foreign']));
    const seeded = await psql(`
      insert into users (id, created_at, updated_at, email, display_name) values (gen_random_uuid(), now(), now(), 'notes-migration@devmentor.test', 'Synthetic migration persona');
      insert into mentor_profiles (id, created_at, updated_at, user_id, headline) select gen_random_uuid(), now(), now(), id, 'Kept notes history' from users;
      insert into slots (id, created_at, updated_at, mentor_profile_id, starts_at) select gen_random_uuid(), now(), now(), id, '2099-11-06T12:00:00Z' from mentor_profiles;
      insert into bookings (id, created_at, updated_at, slot_id, mentee_id, mentor_profile_id, length_minutes, price_cents, currency, status, starts_at, expires_at)
      select gen_random_uuid(), now(), now(), slots.id, users.id, mentor_profiles.id, 25, 8000, 'PLN', 'confirmed', slots.starts_at, null from slots cross join users cross join mentor_profiles;
      insert into session_notes (id, created_at, updated_at, booking_id, version, revision, body, status) select gen_random_uuid(), now(), now(), id, 1, 1, 'private draft', 'draft' from bookings;
      insert into notifications (id, created_at, updated_at, user_id, booking_id, kind) select gen_random_uuid(), now(), now(), mentee_id, id, 'booking_confirmed' from bookings;
      insert into notifications (id, created_at, updated_at, user_id, booking_id, kind) select gen_random_uuid(), now(), now(), mentee_id, id, 'note_awaiting_approval' from bookings;
    `);
    expect(seeded.exitCode, seeded.stderr).toBe(0);
    for (const change of ["status = 'unknown'", 'revision = 0', 'version = 0', "body = ''", "status = 'awaiting_approval'", "status = 'approved', sent_at = now()", "status = 'declined', sent_at = now(), decided_at = now(), decline_comment = ' '"]) {
      expect((await psql(`update session_notes set ${change}`)).exitCode).not.toBe(0);
    }
    expect((await psql(`insert into session_notes select gen_random_uuid(), created_at, updated_at, booking_id, version, revision, body, status, decline_comment, sent_at, decided_at from session_notes`)).exitCode).not.toBe(0);
    expect((await psql(`update session_notes set status = 'awaiting_approval', sent_at = now()`)).exitCode).toBe(0);
    expect((await psql('delete from bookings')).exitCode).not.toBe(0);
    await runNpm(['run', 'db:migrate:down'], environment);
    expect(await query(`select to_json(to_regclass('public.session_notes'))`)).toBeNull();
    expect(await query('select json_agg(kind) from notifications')).toEqual(['booking_confirmed']);
    expect(await query('select count(*) from bookings')).toBe(1);
    expect((await psql(`update notifications set kind = 'note_awaiting_approval'`)).exitCode).not.toBe(0);
    await runNpm(['run', 'db:migrate'], environment);
    expect(await query(`select to_json(to_regclass('public.session_notes'))`)).toBe('session_notes');
    expect(await query('select count(*) from session_notes')).toBe(0);
    expect(await query('select json_agg(kind) from notifications')).toEqual(['booking_confirmed']);
  } finally { await postgres.stop(); }
});
