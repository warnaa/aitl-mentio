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

    // up: existing (GitHub-only) rows have no password
    await runNpm(['run', 'db:migrate'], environment);
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
    await runNpm(['run', 'db:migrate'], environment);
    expect(await passwordColumn()).toHaveLength(1);
    expect(await queryJson(`select json_agg(password_hash) from users`)).toEqual([null]);
  }, 300_000);
});
