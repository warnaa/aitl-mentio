import { MikroORM } from '@mikro-orm/postgresql';
import { expect, it } from 'vitest';
import { entities, Notification } from '../index';

it('discovers per-user, per-booking notifications with idempotent uniqueness and no cascading deletes', async () => {
  const orm = await MikroORM.init({ entities, clientUrl: 'postgresql://unused:unused@127.0.0.1:1/unused' });
  try {
    expect(entities).toContain(Notification);
    const sql = await orm.schema.getCreateSchemaSQL({ wrap: false });
    for (const name of ['notifications_user_kind_booking_version_unique', 'notifications_note_version_check', 'notifications_user_created_index']) expect(sql).toContain(name);
    expect(sql).toContain("kind in ('booking_confirmed', 'answer_posted', 'note_awaiting_approval', 'note_approved', 'note_declined', 'booking_cancelled')");
    const properties = orm.getMetadata().get(Notification).properties;
    expect(properties.user.deleteRule).toBe('no action');
    expect(properties.booking.deleteRule).toBe('no action');
    expect(properties.readAt.nullable).toBe(true);
    expect(properties.emailSentAt.nullable).toBe(true);
  } finally { await orm.close(); }
});
