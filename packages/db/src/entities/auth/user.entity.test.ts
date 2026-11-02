import { MikroORM } from '@mikro-orm/postgresql';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { MentorProfile } from '../mentors/mentor-profile.entity';
import { User } from './user.entity';

/**
 * Discovers the real entity metadata (MikroORM v7's `init` does not connect, so no
 * database is needed) and pins the column mapping the `auth-identity` migration and
 * every authorization decision rely on — in particular that `p.array()` really is a
 * PostgreSQL `text[]`.
 */
let orm: MikroORM;

beforeAll(async () => {
  orm = await MikroORM.init({
    entities: [User, MentorProfile],
    clientUrl: 'postgresql://unused:unused@127.0.0.1:1/unused',
  });
});

afterAll(async () => {
  await orm.close();
});

function userMeta() {
  return orm.getMetadata().get(User);
}

function property(name: string) {
  return userMeta().properties[name as never] as unknown as {
    columnTypes: string[];
    nullable?: boolean;
    unique?: boolean;
    default?: unknown;
    defaultRaw?: string;
    length?: number;
  };
}

describe('User entity', () => {
  it('maps roles to a non-null text[] defaulting to {mentee} with the roles check', () => {
    const roles = property('roles');

    expect(roles.columnTypes).toEqual(['text[]']);
    expect(roles.nullable).toBeFalsy();
    expect(roles.default).toEqual(['mentee']);
    expect(roles.defaultRaw).toBe("'{mentee}'");
    // Discovery lifts a property-level `.check()` into the entity's `checks` list.
    expect(userMeta().checks).toEqual([
      {
        name: 'users_roles_check',
        property: 'roles',
        expression:
          "cardinality(roles) > 0 and array_ndims(roles) = 1 and array_position(roles, null) is null and roles <@ array['mentee', 'mentor', 'operator']::text[]",
      },
    ]);
  });

  it('maps the GitHub identity, avatar, verification and session-version columns', () => {
    expect(property('githubId')).toMatchObject({ columnTypes: ['varchar(64)'], nullable: true, unique: true });
    expect(property('githubLogin')).toMatchObject({ columnTypes: ['varchar(64)'], nullable: true });
    expect(property('githubLogin').unique).toBeFalsy();
    expect(property('avatarUrl')).toMatchObject({ columnTypes: ['text'], nullable: true });
    expect(property('emailVerifiedAt')).toMatchObject({ columnTypes: ['timestamptz'], nullable: true });
    expect(property('sessionVersion')).toMatchObject({ columnTypes: ['int'], default: 0 });
    expect(property('sessionVersion').nullable).toBeFalsy();
  });

  it('generates the DDL the auth-identity migration applies', async () => {
    const ddl = await orm.schema.getCreateSchemaSQL({ wrap: false });

    expect(ddl).toContain(`"roles" text[] not null default '{mentee}'`);
    expect(ddl).toContain('"session_version" int not null default 0');
    expect(ddl).toContain('add constraint "users_roles_check" check (');
    expect(ddl).toContain('add constraint "users_github_id_unique" unique ("github_id")');
  });

  it('keeps the 1:1 link to the mentor profile', () => {
    const mentorProfile = userMeta().properties['mentorProfile' as never] as unknown as {
      kind: string;
      mappedBy: string;
    };

    expect(mentorProfile).toMatchObject({ kind: '1:1', mappedBy: 'user' });
  });
});
