import { beforeEach, expect, it, vi } from 'vitest';
const { service, scope } = vi.hoisted(() => {
  const service = {
    getMine: vi.fn(),
    update: vi.fn(),
    publish: vi.fn(),
    unpublish: vi.fn(),
    getPublicBySlug: vi.fn(),
  };
  return { service, scope: { mentorProfileService: service } };
});
vi.mock('@devmentor/core', async (original) => {
  const core = await original<typeof import('@devmentor/core')>();
  return {
    ...core,
    withRequestScope: async (_req: Request, fn: (c: typeof scope) => unknown) => fn(scope),
    makeOwnedResourceRoute: vi.fn((o) => ({
      GET: () => o.read(scope, {}),
      PUT: () => o.update(scope, { bio: 'saved' }, {}),
    })),
    ownedAction: vi.fn((o) => () => o.run(scope, {}, new Request('http://test'))),
  };
});
import { GET, PUT, dynamic } from './route';
import { POST as publish, dynamic as publishDynamic } from './publish/route';
import { POST as unpublish, dynamic as unpublishDynamic } from './unpublish/route';
import { GET as publicRead, dynamic as publicDynamic } from '../[slug]/route';
beforeEach(() => vi.clearAllMocks());
it('configures dynamic mentor singleton and forwards parsed input', async () => {
  expect(dynamic).toBe('force-dynamic');
  await GET(undefined as never, undefined as never);
  await PUT(undefined as never, undefined as never);
  expect(service.getMine).toHaveBeenCalledOnce();
  expect(service.update).toHaveBeenCalledWith({ bio: 'saved' });
});
it('configures publication actions', async () => {
  expect(publishDynamic).toBe('force-dynamic');
  expect(unpublishDynamic).toBe('force-dynamic');
  await publish(undefined as never, undefined as never);
  await unpublish(undefined as never, undefined as never);
  expect(service.publish).toHaveBeenCalledOnce();
  expect(service.unpublish).toHaveBeenCalledOnce();
});
it('reads the public projection by slug', async () => {
  expect(publicDynamic).toBe('force-dynamic');
  service.getPublicBySlug.mockResolvedValue({ slug: 'ada', bio: 'Work' });
  const r = await publicRead(new Request('http://test/api/mentors/ada'), {
    params: Promise.resolve({ slug: 'ada' }),
  });
  expect(await r.json()).toEqual({ ok: true, data: { slug: 'ada', bio: 'Work' } });
  expect(service.getPublicBySlug).toHaveBeenCalledWith('ada');
});
