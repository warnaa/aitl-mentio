import { MikroORM } from '@mikro-orm/postgresql';
import { expect, it } from 'vitest';
import { Slot } from './slot.entity';
import { User } from '../auth/user.entity';
import { MentorProfile } from '../mentors/mentor-profile.entity';

it('maps instants, owner cascade and active-only uniqueness without booking fields', async () => {
  const orm = await MikroORM.init({ entities: [User, MentorProfile, Slot], clientUrl: 'postgresql://unused:unused@127.0.0.1:1/unused' });
  try {
    const sql = await orm.schema.getCreateSchemaSQL({ wrap: false });
    expect(sql).toContain('"starts_at" timestamptz not null');
    expect(sql).toContain('"removed_at" timestamptz null');
    expect(sql).toContain('"last_published_availability_at" timestamptz null');
    expect(sql).toContain('where removed_at is null');
    expect(sql).toContain('on delete cascade');
    expect(Object.keys(orm.getMetadata().get(Slot).properties)).not.toContain('booking');
  } finally { await orm.close(); }
});
