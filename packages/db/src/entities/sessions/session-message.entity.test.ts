import { MikroORM } from '@mikro-orm/postgresql';
import { expect, it } from 'vitest';
import { entities, SessionMessage } from '../index';

it('discovers booking-scoped session messages with a length check, an ordered index and no cascading deletes', async () => {
  const orm = await MikroORM.init({ entities, clientUrl: 'postgresql://unused:unused@127.0.0.1:1/unused' });
  try {
    expect(entities).toContain(SessionMessage);
    const sql = await orm.schema.getCreateSchemaSQL({ wrap: false });
    expect(sql).toContain('session_messages_booking_created_index');
    expect(sql).toContain('char_length(body) between 1 and 4000');
    const properties = orm.getMetadata().get(SessionMessage).properties;
    expect(properties.booking.deleteRule).toBe('no action');
    expect(properties.author.deleteRule).toBe('no action');
    expect(properties.body.nullable).toBeFalsy();
  } finally { await orm.close(); }
});
