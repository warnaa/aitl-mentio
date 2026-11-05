import { MikroORM } from '@mikro-orm/postgresql';
import { expect, it } from 'vitest';
import { Booking } from './booking.entity';
import { entities } from '../index';

it('preserves booking history while constraining active occupancy, money and duration', async () => {
  const orm = await MikroORM.init({ entities, clientUrl: 'postgresql://unused:unused@127.0.0.1:1/unused' });
  try {
    const sql = await orm.schema.getCreateSchemaSQL({ wrap: false });
    const metadata = orm.getMetadata().get(Booking);
    expect(sql).toContain('where status in (\'pending\', \'confirmed\')');
    expect(sql).toContain('length_minutes in (25, 50)');
    expect(sql).toContain('price_cents > 0');
    expect(sql).toContain("currency = 'PLN'");
    expect(sql).toContain("status in ('pending', 'confirmed', 'cancelled', 'expired')");
    expect(sql).toContain("status <> 'pending' or expires_at is not null");
    expect(sql).toContain('"booked_at" timestamptz null');
    expect(sql).toContain('"expires_at" timestamptz null');
    expect(sql).toContain('"stripe_checkout_session_id" varchar(255) null');
    expect(sql).toContain('bookings_stripe_checkout_session_id_unique');
    expect(sql).toContain('bookings_mentor_start_index');
    expect(metadata.properties.slot.kind).toBe('m:1');
    expect(metadata.properties.slot.deleteRule).toBe('no action');
    expect(metadata.properties.mentee.deleteRule).toBe('no action');
    expect(metadata.properties.mentorProfile.deleteRule).toBe('no action');
    expect(metadata.properties.slot.unique).not.toBe(true);
  } finally {
    await orm.close();
  }
});
