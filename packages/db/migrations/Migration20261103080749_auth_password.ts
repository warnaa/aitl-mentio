import { Migration } from '@mikro-orm/migrations';

/**
 * E01 Slice 4 — the password credential on `users`
 * (`.ai/specs/2026-09-04-accounts-and-roles.md`, Data Model).
 *
 * Generated with `npm run db:migration:create -- --name auth-password`. `text`, not
 * `varchar(60)`: 60 is bcrypt's width, and the hash is a self-describing scrypt string
 * whose algorithm may change. Null for GitHub-only accounts, so existing rows need no
 * backfill. `down` drops the column and with it every stored password.
 */
export class Migration20261103080749_auth_password extends Migration {

  override name = 'Migration20261103080749_auth_password';

  override up(): void | Promise<void> {
    this.addSql(`alter table "users" add "password_hash" text null;`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "users" drop column "password_hash";`);
  }

}
