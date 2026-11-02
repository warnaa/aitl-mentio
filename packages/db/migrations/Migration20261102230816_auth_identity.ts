import { Migration } from '@mikro-orm/migrations';

/**
 * E01 Slice 2 — account identity columns on `users`
 * (`.ai/specs/2026-09-04-accounts-and-roles.md`, Data Model).
 *
 * Generated with `npm run db:migration:create -- --name auth-identity`, then extended by
 * hand with the backfill. The `users_roles_check` constraint is declared on the entity
 * (`User.roles`), so the committed snapshot carries it too. It rejects empty arrays,
 * multi-dimensional arrays, null members and any value outside `mentee | mentor |
 * operator`; it deliberately does not reject duplicates (an application invariant).
 */
export class Migration20261102230816_auth_identity extends Migration {

  override name = 'Migration20261102230816_auth_identity';

  override up(): void | Promise<void> {
    this.addSql(`alter table "users" add "roles" text[] not null default '{mentee}', add "github_id" varchar(64) null, add "github_login" varchar(64) null, add "avatar_url" text null, add "email_verified_at" timestamptz null, add "session_version" int not null default 0;`);
    this.addSql(`alter table "users" add constraint "users_github_id_unique" unique ("github_id");`);
    this.addSql(`alter table "users" add constraint "users_roles_check" check (cardinality(roles) > 0 and array_ndims(roles) = 1 and array_position(roles, null) is null and roles <@ array['mentee', 'mentor', 'operator']::text[]);`);
    // Every row that exists before this migration is founder-created seed or demo data.
    // Marking it verified (rather than deleting it) keeps the seeded mentor intact, and a
    // verified address is what lets a later GitHub sign-in link to the row.
    this.addSql(`update "users" set "email_verified_at" = now() where "email_verified_at" is null;`);
  }

  override down(): void | Promise<void> {
    // Hand-checked inverse of `up`: constraints first, then the columns. The backfill
    // needs no reversal because its column is dropped.
    this.addSql(`alter table "users" drop constraint "users_github_id_unique";`);
    this.addSql(`alter table "users" drop constraint "users_roles_check";`);
    this.addSql(`alter table "users" drop column "roles", drop column "github_id", drop column "github_login", drop column "avatar_url", drop column "email_verified_at", drop column "session_version";`);
  }

}
