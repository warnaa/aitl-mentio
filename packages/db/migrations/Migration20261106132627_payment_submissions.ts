import { Migration } from '@mikro-orm/migrations';

export class Migration20261106132627_payment_submissions extends Migration {

  override name = 'Migration20261106132627_payment_submissions';

  override up(): void | Promise<void> {
    this.addSql(`alter table "bookings" drop constraint "bookings_currency_check";`);
    this.addSql(`alter table "bookings" add constraint "bookings_currency_check" check (currency = 'PLN');`);

    this.addSql(`alter table "payment_attempts" add "submission_count" int not null default 0, add "rejected_submission_count" int not null default 0;`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "bookings" drop constraint "bookings_currency_check";`);
    this.addSql(`alter table "bookings" add constraint "bookings_currency_check" check ("currency" in ('PLN'));`);

    this.addSql(`alter table "payment_attempts" drop column "submission_count", drop column "rejected_submission_count";`);
  }

}
