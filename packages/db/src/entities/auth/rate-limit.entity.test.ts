import { MikroORM } from '@mikro-orm/postgresql';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { entities } from '../index';
import { AuthRateLimit } from './rate-limit.entity';

/** Real metadata discovery (MikroORM v7's `init` does not connect). */
let orm: MikroORM;

beforeAll(async () => {
  orm = await MikroORM.init({ entities, clientUrl: 'postgresql://unused:unused@127.0.0.1:1/unused' });
});

afterAll(async () => {
  await orm.close();
});

describe('AuthRateLimit entity', () => {
  it('maps auth_rate_limits with a text primary key, a timestamptz window and an integer count', () => {
    const meta = orm.getMetadata().get(AuthRateLimit);
    expect(meta.tableName).toBe('auth_rate_limits');
    expect(meta.primaryKeys).toEqual(['key']);
    const column = (name: string) => (meta.properties[name as never] as unknown as { columnTypes: string[] }).columnTypes;
    expect(column('key')).toEqual(['text']);
    expect(column('windowStart')).toEqual(['timestamptz']);
    expect(column('count')).toEqual(['int']);
  });

  it('is the one entity without baseProperties: no id or timestamps', () => {
    const props = Object.keys(orm.getMetadata().get(AuthRateLimit).properties).sort();
    expect(props).toEqual(['count', 'key', 'windowStart']);
  });

  it('indexes window_start for the purge', () => {
    expect(orm.getMetadata().get(AuthRateLimit).properties.windowStart.index).toBe('auth_rate_limits_window_start_index');
  });

  it('is registered for discovery', () => {
    expect(entities).toContain(AuthRateLimit);
  });
});
