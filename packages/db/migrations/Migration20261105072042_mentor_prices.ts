import { Migration } from '@mikro-orm/migrations';

export class Migration20261105072042_mentor_prices extends Migration {

  override name = 'Migration20261105072042_mentor_prices';

  override up(): void | Promise<void> {
    this.addSql(`alter table "mentor_profiles" add "price_25_cents" int null, add "price_50_cents" int null;`);
    this.addSql(`alter table "mentor_profiles" add constraint "mentor_profiles_price_25_cents_check" check (price_25_cents > 0);`);
    this.addSql(`alter table "mentor_profiles" add constraint "mentor_profiles_price_50_cents_check" check (price_50_cents > 0);`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "mentor_profiles" drop constraint "mentor_profiles_price_25_cents_check";`);
    this.addSql(`alter table "mentor_profiles" drop constraint "mentor_profiles_price_50_cents_check";`);
    this.addSql(`alter table "mentor_profiles" drop column "price_25_cents", drop column "price_50_cents";`);
  }

}
