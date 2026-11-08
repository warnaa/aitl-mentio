import { MikroORM } from '@mikro-orm/postgresql';
import { expect, it } from 'vitest';
import { entities, SessionNote } from '../index';

it('discovers private booking versions with bounded bodies, revision and lifecycle checks', async () => {
  const orm = await MikroORM.init({ entities, clientUrl: 'postgresql://unused:unused@127.0.0.1:1/unused' });
  try {
    expect(entities).toContain(SessionNote);
    const sql = await orm.schema.getCreateSchemaSQL({ wrap: false });
    for (const part of ['session_notes_booking_version_unique', 'session_notes_state_check', 'char_length(btrim(body)) between 1 and 20000', 'version >= 1', 'revision >= 1', "status = 'declined'", 'between 1 and 2000']) expect(sql).toContain(part);
    const props = orm.getMetadata().get(SessionNote).properties;
    expect(props.booking.deleteRule).toBe('no action');
    expect(props.sentAt.nullable).toBe(true);
    expect(props.decidedAt.nullable).toBe(true);
    expect(props.declineComment.nullable).toBe(true);
  } finally { await orm.close(); }
});
