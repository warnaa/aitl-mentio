import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { expect, it } from 'vitest';
import { integrationChildEnvironment } from './environment';
import { runNpm } from './npm';

const BOOKING_MIGRATION = 'Migration20261105222730_bookings';
const SUBMISSION_MIGRATION = 'Migration20261106132627_payment_submissions';
const PAYMENT_TABLES = ['payment_attempts', 'payment_resolutions', 'processed_webhook_events'];
const PAYMENT_COLUMNS = ['amount_paid_cents', 'paid_at', 'payment_pending', 'stripe_payment_intent_id'];

it('MIGRATION-015 adds payment evidence, preserves unpaid history and reverses up down up', async () => {
  const postgres = await new PostgreSqlContainer('postgres:17-alpine')
    .withDatabase('payment_migration')
    .withUsername('devmentor')
    .withPassword('devmentor')
    .start();
  const environment = integrationChildEnvironment(postgres.getConnectionUri());
  const psql = (sql: string) => postgres.exec([
    'psql', '-X', '-q', '-t', '-A', '-v', 'ON_ERROR_STOP=1',
    '-U', 'devmentor', '-d', 'payment_migration', '-c', sql,
  ]);
  const query = async <T>(sql: string): Promise<T> => {
    const response = await psql(sql);
    expect(response.exitCode, response.stderr || response.output).toBe(0);
    return JSON.parse(response.stdout.trim() || 'null') as T;
  };
  const tables = () => query<string[]>(`select coalesce(json_agg(table_name order by table_name), '[]') from information_schema.tables where table_schema = 'public' and table_name in ('payment_attempts', 'payment_resolutions', 'processed_webhook_events')`);
  const columns = () => query<string[]>(`select coalesce(json_agg(column_name order by column_name), '[]') from information_schema.columns where table_schema = 'public' and table_name = 'bookings' and column_name in ('amount_paid_cents', 'paid_at', 'payment_pending', 'stripe_payment_intent_id')`);
  const counters = () => query<{ name: string; default: string }[]>(`select coalesce(json_agg(json_build_object('name', column_name, 'default', column_default) order by column_name), '[]') from information_schema.columns where table_schema = 'public' and table_name = 'payment_attempts' and column_name in ('rejected_submission_count', 'submission_count')`);
  const migrateTo = (name: string) => runNpm(['run', 'migration:up', '--workspace', '@devmentor/db', '--', '--to', name], environment);

  try {
    await migrateTo(BOOKING_MIGRATION);
    const seed = await psql(`
      insert into users (id, created_at, updated_at, email, display_name) values (gen_random_uuid(), now(), now(), 'migration-payment@devmentor.test', 'Synthetic migration persona');
      insert into mentor_profiles (id, created_at, updated_at, user_id, headline) select gen_random_uuid(), now(), now(), id, 'Kept payment history' from users;
      insert into slots (id, created_at, updated_at, mentor_profile_id, starts_at) select gen_random_uuid(), now(), now(), id, '2099-11-06T12:00:00Z' from mentor_profiles;
      insert into bookings (id, created_at, updated_at, slot_id, mentee_id, mentor_profile_id, length_minutes, price_cents, currency, status, starts_at, expires_at)
      select gen_random_uuid(), now(), now(), slots.id, users.id, mentor_profiles.id, 25, 8000, 'PLN', 'pending', slots.starts_at, '2099-11-06T11:00:00Z' from slots cross join users cross join mentor_profiles;
    `);
    expect(seed.exitCode, seed.stderr || seed.output).toBe(0);

    await migrateTo(SUBMISSION_MIGRATION);
    expect(await tables()).toEqual(PAYMENT_TABLES);
    expect(await columns()).toEqual(PAYMENT_COLUMNS);
    expect(await query(`select json_agg(json_build_object('status', status, 'price', price_cents, 'paymentPending', payment_pending, 'paidAt', paid_at, 'amountPaid', amount_paid_cents, 'paymentIntent', stripe_payment_intent_id)) from bookings`)).toEqual([
      { status: 'pending', price: 8000, paymentPending: false, paidAt: null, amountPaid: null, paymentIntent: null },
    ]);
    const constraints = await query<string[]>(`select json_agg(conname order by conname) from pg_constraint where conrelid in ('payment_attempts'::regclass, 'processed_webhook_events'::regclass, 'payment_resolutions'::regclass, 'bookings'::regclass)`);
    expect(constraints).toEqual(expect.arrayContaining([
      'payment_attempts_booking_id_unique', 'payment_attempts_idempotency_key_unique',
      'payment_attempts_session_id_unique', 'processed_webhook_events_event_id_unique',
      'bookings_stripe_payment_intent_id_unique', 'payment_resolutions_actor_id_foreign',
    ]));
    expect(await counters()).toEqual([
      { name: 'rejected_submission_count', default: '0' },
      { name: 'submission_count', default: '0' },
    ]);

    await runNpm(['run', 'db:migrate:down'], environment);
    expect(await counters()).toEqual([]);
    expect(await tables()).toEqual(PAYMENT_TABLES);
    await runNpm(['run', 'db:migrate:down'], environment);
    expect(await tables()).toEqual([]);
    expect(await columns()).toEqual([]);
    expect(await query(`select json_agg(json_build_object('status', status, 'price', price_cents)) from bookings`)).toEqual([{ status: 'pending', price: 8000 }]);

    await migrateTo(SUBMISSION_MIGRATION);
    expect(await tables()).toEqual(PAYMENT_TABLES);
    expect(await columns()).toEqual(PAYMENT_COLUMNS);
    expect(await query(`select json_agg(payment_pending) from bookings`)).toEqual([false]);
    expect(await counters()).toHaveLength(2);
  } finally {
    await postgres.stop();
  }
});
