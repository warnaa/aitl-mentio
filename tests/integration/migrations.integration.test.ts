import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { integrationChildEnvironment } from './environment';
import { runNpm } from './npm';

/**
 * TC-MIGRATION-001 — `SDLC.md` requires every schema migration to be exercised up *and*
 * down. This test owns its own PostgreSQL container (the app's database is shared with
 * the browser scenarios and must stay seeded), drives the real `npm` migration scripts
 * against it, and inspects the schema with `psql` inside the container.
 */
const BASELINE = 'Migration20260901142829';
const AUTH_IDENTITY = 'Migration20261102230816_auth_identity';
const AUTH_PASSWORD = 'Migration20261103080749_auth_password';
const AUTH_RATE_LIMIT = 'Migration20261103081334_auth_rate_limit';
const INVITATIONS = 'Migration20261104000100_invitations';
const MENTOR_PAGE = 'Migration20261104225821_mentor_page';
const DATABASE = 'devmentor_migrations';
const IDENTITY_COLUMNS = [
  'roles',
  'github_id',
  'github_login',
  'avatar_url',
  'email_verified_at',
  'session_version',
];

let postgres: StartedPostgreSqlContainer | undefined;
let environment: NodeJS.ProcessEnv;

/** Migrate up to and including `name`, whatever later migrations exist. */
const migrateTo = (name: string) =>
  runNpm(['run', 'migration:up', '--workspace', '@devmentor/db', '--', '--to', name], environment);

/** Each scenario owns a fresh PostgreSQL, stopped afterwards on success or failure. */
function ownPostgres(): void {
  beforeAll(async () => {
    postgres = await new PostgreSqlContainer('postgres:17-alpine')
      .withDatabase(DATABASE)
      .withUsername('devmentor')
      .withPassword('devmentor')
      .start();
    environment = integrationChildEnvironment(postgres.getConnectionUri());
  });

  afterAll(async () => {
    await postgres?.stop();
    postgres = undefined;
  });
}

/** Run one statement with psql in the container; the statement must yield one JSON value. */
async function queryJson<T>(sql: string): Promise<T> {
  const result = await psql(sql);
  if (result.exitCode !== 0) {
    throw new Error(`psql failed (${result.exitCode}): ${result.stderr || result.output}`);
  }
  return JSON.parse(result.stdout.trim() || 'null') as T;
}

async function psql(sql: string) {
  if (!postgres) throw new Error('PostgreSQL container is not running');
  return postgres.exec([
    'psql',
    '-X',
    '-q',
    '-t',
    '-A',
    '-v',
    'ON_ERROR_STOP=1',
    '-U',
    postgres.getUsername(),
    '-d',
    DATABASE,
    '-c',
    sql,
  ]);
}

type Column = {
  name: string;
  type: string;
  nullable: boolean;
  default: string | null;
  length: number | null;
};

async function identityColumns(): Promise<Column[]> {
  const rows = await queryJson<Column[] | null>(`
    select json_agg(json_build_object(
      'name', column_name,
      'type', udt_name,
      'nullable', is_nullable = 'YES',
      'default', column_default,
      'length', character_maximum_length
    ) order by column_name)
    from information_schema.columns
    where table_schema = 'public' and table_name = 'users'
      and column_name in (${IDENTITY_COLUMNS.map((name) => `'${name}'`).join(', ')})`);
  return rows ?? [];
}

async function userConstraints(): Promise<string[]> {
  return (
    (await queryJson<string[] | null>(
      `select json_agg(conname order by conname) from pg_constraint where conrelid = 'public.users'::regclass`,
    )) ?? []
  );
}

async function appliedMigrations(): Promise<string[]> {
  return (
    (await queryJson<string[] | null>(
      `select json_agg(name order by id) from mikro_orm_migrations`,
    )) ?? []
  );
}

async function insertUser(email: string, roles?: string) {
  const columns = roles === undefined ? '' : ', roles';
  const values = roles === undefined ? '' : `, ${roles}`;
  return psql(
    `insert into users (id, created_at, updated_at, email, display_name${columns})
     values (gen_random_uuid(), now(), now(), '${email}', 'Fixture'${values})`,
  );
}

async function expectIdentitySchema(): Promise<void> {
  expect(await identityColumns()).toEqual([
    { name: 'avatar_url', type: 'text', nullable: true, default: null, length: null },
    { name: 'email_verified_at', type: 'timestamptz', nullable: true, default: null, length: null },
    { name: 'github_id', type: 'varchar', nullable: true, default: null, length: 64 },
    { name: 'github_login', type: 'varchar', nullable: true, default: null, length: 64 },
    { name: 'roles', type: '_text', nullable: false, default: "'{mentee}'::text[]", length: null },
    { name: 'session_version', type: 'int4', nullable: false, default: '0', length: null },
  ]);
  expect(await userConstraints()).toEqual(
    expect.arrayContaining(['users_github_id_unique', 'users_roles_check']),
  );
  expect(await appliedMigrations()).toEqual([BASELINE, AUTH_IDENTITY]);
}

/** Every row that predates the migration is backfilled as verified and gets the default role. */
async function expectBackfilled(): Promise<void> {
  expect(
    await queryJson(`
      select json_agg(json_build_object(
        'email', email,
        'roles', roles,
        'verified', email_verified_at is not null,
        'sessionVersion', session_version
      ) order by email)
      from users`),
  ).toEqual([
    { email: 'legacy-a@devmentor.test', roles: ['mentee'], verified: true, sessionVersion: 0 },
    { email: 'legacy-b@devmentor.test', roles: ['mentee'], verified: true, sessionVersion: 0 },
  ]);
}

describe('TC-MIGRATION-001 auth-identity migration round trip', () => {
  ownPostgres();

  it('applies up, down and up again, preserving rows and enforcing the roles check', async () => {
    // Start from the schema as it was before the migration, with existing rows in it.
    await migrateTo(BASELINE);
    expect(await appliedMigrations()).toEqual([BASELINE]);
    expect((await insertUser('legacy-a@devmentor.test')).exitCode).toBe(0);
    expect((await insertUser('legacy-b@devmentor.test')).exitCode).toBe(0);

    // up (pinned: later migrations are exercised by their own scenario)
    await migrateTo(AUTH_IDENTITY);
    await expectIdentitySchema();
    await expectBackfilled();

    // The check rejects an empty set, a null member, an unknown role and a nested array…
    for (const [email, roles] of [
      ['empty@devmentor.test', `'{}'`],
      ['null-member@devmentor.test', `array['mentee', null]`],
      ['unknown@devmentor.test', `'{admin}'`],
      ['nested@devmentor.test', `'{{mentee}}'`],
    ] as const) {
      const rejected = await insertUser(email, roles);
      expect(rejected.exitCode, email).not.toBe(0);
      expect(rejected.stderr || rejected.output, email).toContain('users_roles_check');
    }
    // …and accepts combined roles, duplicates included (an application invariant).
    expect((await insertUser('combined@devmentor.test', `'{mentor,operator}'`)).exitCode).toBe(0);
    expect((await insertUser('duplicate@devmentor.test', `'{mentor,mentor}'`)).exitCode).toBe(0);
    // A new row is not backfilled: verification is for pre-existing rows only.
    expect(
      await queryJson(
        `select json_agg(email_verified_at order by email) from users where email in ('combined@devmentor.test', 'duplicate@devmentor.test')`,
      ),
    ).toEqual([null, null]);
    await psql(
      `delete from users where email in ('combined@devmentor.test', 'duplicate@devmentor.test')`,
    );

    // down
    await runNpm(['run', 'db:migrate:down'], environment);
    expect(await identityColumns()).toEqual([]);
    expect(await userConstraints()).not.toEqual(
      expect.arrayContaining(['users_github_id_unique']),
    );
    expect(await userConstraints()).not.toEqual(expect.arrayContaining(['users_roles_check']));
    expect(await appliedMigrations()).toEqual([BASELINE]);
    expect(
      await queryJson(`select json_agg(email order by email) from users`),
    ).toEqual(['legacy-a@devmentor.test', 'legacy-b@devmentor.test']);

    // up again
    await migrateTo(AUTH_IDENTITY);
    await expectIdentitySchema();
    await expectBackfilled();
  }, 300_000);
});

async function passwordColumn(): Promise<Column[]> {
  return (
    (await queryJson<Column[] | null>(`
      select json_agg(json_build_object(
        'name', column_name,
        'type', udt_name,
        'nullable', is_nullable = 'YES',
        'default', column_default,
        'length', character_maximum_length
      ))
      from information_schema.columns
      where table_schema = 'public' and table_name = 'users' and column_name = 'password_hash'`)) ?? []
  );
}

describe('TC-MIGRATION-002 auth-password migration round trip', () => {
  ownPostgres();

  it('adds a nullable text password_hash, drops it on down, and keeps every row', async () => {
    await migrateTo(AUTH_IDENTITY);
    expect((await insertUser('github-only@devmentor.test')).exitCode).toBe(0);

    // up (pinned: `db:migrate` would also apply later migrations, and `db:migrate:down`
    // would then revert the newest one instead of this): existing GitHub-only rows have
    // no password
    await migrateTo(AUTH_PASSWORD);
    expect(await appliedMigrations()).toEqual([BASELINE, AUTH_IDENTITY, AUTH_PASSWORD]);
    expect(await passwordColumn()).toEqual([
      { name: 'password_hash', type: 'text', nullable: true, default: null, length: null },
    ]);
    expect(await queryJson(`select json_agg(password_hash) from users`)).toEqual([null]);
    // `text`, not a fixed width: a long self-describing hash fits.
    const longHash = `scrypt$131072$8$1$${'s'.repeat(24)}$${'k'.repeat(88)}`;
    expect((await psql(`update users set password_hash = '${longHash}'`)).exitCode).toBe(0);

    // down: the column goes, the row stays
    await runNpm(['run', 'db:migrate:down'], environment);
    expect(await appliedMigrations()).toEqual([BASELINE, AUTH_IDENTITY]);
    expect(await passwordColumn()).toEqual([]);
    expect(await queryJson(`select json_agg(email) from users`)).toEqual(['github-only@devmentor.test']);

    // up again
    await migrateTo(AUTH_PASSWORD);
    expect(await passwordColumn()).toHaveLength(1);
    expect(await queryJson(`select json_agg(password_hash) from users`)).toEqual([null]);
  }, 300_000);
});

async function rateLimitTable(): Promise<{ columns: Column[]; indexes: string[] }> {
  const columns =
    (await queryJson<Column[] | null>(`
      select json_agg(json_build_object(
        'name', column_name,
        'type', udt_name,
        'nullable', is_nullable = 'YES',
        'default', column_default,
        'length', character_maximum_length
      ) order by column_name)
      from information_schema.columns
      where table_schema = 'public' and table_name = 'auth_rate_limits'`)) ?? [];
  const indexes =
    (await queryJson<string[] | null>(
      `select json_agg(indexname order by indexname) from pg_indexes where schemaname = 'public' and tablename = 'auth_rate_limits'`,
    )) ?? [];
  return { columns, indexes };
}

describe('TC-MIGRATION-003 auth-rate-limit migration round trip', () => {
  ownPostgres();

  it('creates the counter table with its index, drops it on down, and creates it again', async () => {
    await migrateTo(AUTH_PASSWORD);
    expect((await insertUser('kept@devmentor.test')).exitCode).toBe(0);

    // up (pinned, like TC-MIGRATION-002, so later migrations cannot change its meaning)
    await migrateTo(AUTH_RATE_LIMIT);
    expect(await appliedMigrations()).toEqual([BASELINE, AUTH_IDENTITY, AUTH_PASSWORD, AUTH_RATE_LIMIT]);
    expect(await rateLimitTable()).toEqual({
      columns: [
        { name: 'count', type: 'int4', nullable: false, default: null, length: null },
        { name: 'key', type: 'text', nullable: false, default: null, length: null },
        { name: 'window_start', type: 'timestamptz', nullable: false, default: null, length: null },
      ],
      indexes: ['auth_rate_limits_pkey', 'auth_rate_limits_window_start_index'],
    });
    expect((await psql(`insert into auth_rate_limits (key, window_start, count) values ('sign-in:ip:x', now(), 1)`)).exitCode).toBe(0);
    const duplicate = await psql(`insert into auth_rate_limits (key, window_start, count) values ('sign-in:ip:x', now(), 1)`);
    expect(duplicate.exitCode).not.toBe(0); // the key is the primary key

    // down: the disposable counters go, users stay
    await runNpm(['run', 'db:migrate:down'], environment);
    expect(await appliedMigrations()).toEqual([BASELINE, AUTH_IDENTITY, AUTH_PASSWORD]);
    expect(await rateLimitTable()).toEqual({ columns: [], indexes: [] });
    expect(await queryJson(`select json_agg(email) from users`)).toEqual(['kept@devmentor.test']);

    // up again
    await migrateTo(AUTH_RATE_LIMIT);
    expect((await rateLimitTable()).indexes).toEqual(['auth_rate_limits_pkey', 'auth_rate_limits_window_start_index']);
  }, 300_000);
});

/** The named constraints and indexes of `table`, in name order. */
async function constraintsOf(table: string): Promise<string[]> {
  return (
    (await queryJson<string[] | null>(`
      select json_agg(name order by name) from (
        select conname as name from pg_constraint where conrelid = 'public.${table}'::regclass
        union
        select indexname from pg_indexes where schemaname = 'public' and tablename = '${table}'
      ) named`)) ?? []
  );
}

async function columnsOf(table: string, names: string[]): Promise<string[]> {
  return (
    (await queryJson<string[] | null>(`
      select json_agg(column_name order by column_name) from information_schema.columns
      where table_schema = 'public' and table_name = '${table}'
        and column_name in (${names.map((name) => `'${name}'`).join(', ')})`)) ?? []
  );
}

const userId = (email: string) => `(select id from users where email = '${email}')`;

async function insertInvitation(email: string, extra = '') {
  return psql(
    `insert into invitations (id, created_at, updated_at, email, token_hash, stack_tags, expires_at${extra ? ', accepted_at, accepted_by_id' : ''})
     values (gen_random_uuid(), now(), now(), '${email}', md5(random()::text), '{react}', now() + interval '14 days'${extra})`,
  );
}

describe('TC-MIGRATION-004 invitations migration round trip', () => {
  ownPostgres();

  it('creates invitations with its constraints and the first deadline, drops both on down, and recreates them', async () => {
    await migrateTo(AUTH_RATE_LIMIT);
    expect((await insertUser('mentor@devmentor.test')).exitCode).toBe(0);
    expect(
      (await psql(`insert into mentor_profiles (id, created_at, updated_at, user_id, headline)
        values (gen_random_uuid(), now(), now(), ${userId('mentor@devmentor.test')}, 'Kept')`)).exitCode,
    ).toBe(0);

    await migrateTo(INVITATIONS);
    expect(await appliedMigrations()).toEqual([BASELINE, AUTH_IDENTITY, AUTH_PASSWORD, AUTH_RATE_LIMIT, INVITATIONS]);
    expect(await constraintsOf('invitations')).toEqual([
      'invitations_accepted_at_check',
      'invitations_accepted_by_id_foreign',
      'invitations_pkey',
      'invitations_stack_tags_check',
      'invitations_token_hash_unique',
      'invitations_unresolved_email_unique',
    ]);
    expect(await columnsOf('mentor_profiles', ['initial_publish_due_at'])).toEqual(['initial_publish_due_at']);
    expect(await queryJson(`select json_agg(initial_publish_due_at) from mentor_profiles`)).toEqual([null]);

    expect((await insertInvitation('invitee@devmentor.test')).exitCode).toBe(0);
    // One unresolved invitation per address; a resolved one does not count.
    expect((await insertInvitation('invitee@devmentor.test')).exitCode).not.toBe(0);
    expect(
      (await insertInvitation('mentor@devmentor.test', `, now(), ${userId('mentor@devmentor.test')}`)).exitCode,
    ).toBe(0);
    expect((await insertInvitation('mentor@devmentor.test')).exitCode).toBe(0);
    // Acceptance is all or nothing, and tags stay inside the vocabulary.
    expect((await insertInvitation('half@devmentor.test', ', now(), null')).exitCode).not.toBe(0);
    expect(
      (await psql(`insert into invitations (id, created_at, updated_at, email, token_hash, stack_tags, expires_at)
        values (gen_random_uuid(), now(), now(), 'tags@devmentor.test', 'x', '{cobol}', now())`)).exitCode,
    ).not.toBe(0);

    await runNpm(['run', 'db:migrate:down'], environment);
    expect(await appliedMigrations()).toEqual([BASELINE, AUTH_IDENTITY, AUTH_PASSWORD, AUTH_RATE_LIMIT]);
    expect(await queryJson(`select to_regclass('public.invitations')`)).toBeNull();
    expect(await columnsOf('mentor_profiles', ['initial_publish_due_at'])).toEqual([]);
    expect(await queryJson(`select json_agg(headline) from mentor_profiles`)).toEqual(['Kept']);

    await migrateTo(INVITATIONS);
    expect(await constraintsOf('invitations')).toHaveLength(6);
  }, 300_000);
});

const PAGE_COLUMNS = ['public_work_url', 'published_at', 'slug', 'stack_tags'];

describe('TC-MIGRATION-005 mentor-page migration round trip', () => {
  ownPostgres();

  it('adds the page columns and checks, drops them on down keeping profiles, and adds them again', async () => {
    await migrateTo(INVITATIONS);
    for (const email of ['a@devmentor.test', 'b@devmentor.test']) {
      expect((await insertUser(email)).exitCode).toBe(0);
      expect(
        (await psql(`insert into mentor_profiles (id, created_at, updated_at, user_id, headline)
          values (gen_random_uuid(), now(), now(), ${userId(email)}, 'Kept')`)).exitCode,
      ).toBe(0);
    }

    await migrateTo(MENTOR_PAGE);
    expect(await appliedMigrations()).toEqual([
      BASELINE, AUTH_IDENTITY, AUTH_PASSWORD, AUTH_RATE_LIMIT, INVITATIONS, MENTOR_PAGE,
    ]);
    expect(await columnsOf('mentor_profiles', PAGE_COLUMNS)).toEqual(PAGE_COLUMNS);
    expect(await constraintsOf('mentor_profiles')).toEqual(
      expect.arrayContaining([
        'mentor_profiles_published_slug_check',
        'mentor_profiles_slug_unique',
        'mentor_profiles_stack_tags_check',
      ]),
    );
    // Existing profiles stay unpublished drafts with no tags.
    expect(await queryJson(`select json_agg(stack_tags) from mentor_profiles`)).toEqual([[], []]);
    const profile = (email: string) => `user_id = ${userId(email)}`;
    // Publication implies a slug; the slug is unique; tags stay inside the vocabulary.
    expect((await psql(`update mentor_profiles set published_at = now() where ${profile('a@devmentor.test')}`)).exitCode).not.toBe(0);
    expect((await psql(`update mentor_profiles set slug = 'ada', published_at = now() where ${profile('a@devmentor.test')}`)).exitCode).toBe(0);
    expect((await psql(`update mentor_profiles set slug = 'ada' where ${profile('b@devmentor.test')}`)).exitCode).not.toBe(0);
    expect((await psql(`update mentor_profiles set stack_tags = '{cobol}' where ${profile('b@devmentor.test')}`)).exitCode).not.toBe(0);
    expect((await psql(`update mentor_profiles set stack_tags = '{react,python}' where ${profile('b@devmentor.test')}`)).exitCode).toBe(0);

    await runNpm(['run', 'db:migrate:down'], environment);
    expect(await appliedMigrations()).toEqual([BASELINE, AUTH_IDENTITY, AUTH_PASSWORD, AUTH_RATE_LIMIT, INVITATIONS]);
    expect(await columnsOf('mentor_profiles', PAGE_COLUMNS)).toEqual([]);
    expect(await queryJson(`select json_agg(headline) from mentor_profiles`)).toEqual(['Kept', 'Kept']);

    await migrateTo(MENTOR_PAGE);
    expect(await columnsOf('mentor_profiles', PAGE_COLUMNS)).toEqual(PAGE_COLUMNS);
  }, 300_000);
});
