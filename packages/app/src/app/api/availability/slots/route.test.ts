import { expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ list: vi.fn(), publish: vi.fn(), remove: vi.fn() }));
vi.mock('@devmentor/core', async original => ({ ...await original<typeof import('@devmentor/core')>(), ownedAction: (o: { run: (c: unknown, p: unknown) => unknown }) => () => o.run({ slotService: state }, { id: 'slot' }), makeOwnedCollectionRoute: (o: { list: (c: unknown, req: Request) => unknown; create: (c: unknown, i: unknown) => unknown; remove: (c: unknown, p: unknown) => unknown }) => ({ GET: (req: Request) => o.list({ slotService: state }, req), POST: () => o.create({ slotService: state }, { startsAt: 'instant' }), DELETE: () => o.remove({ slotService: state }, { id: 'slot' }) }) }));
import { GET, POST, dynamic } from './route';
import { DELETE, dynamic as deleteDynamic } from './[id]/route';
it('wires collection callbacks and path ID with dynamic rendering', async () => {
  expect(dynamic).toBe('force-dynamic'); expect(deleteDynamic).toBe(dynamic);
  await GET(new Request('http://test/api/availability/slots'), undefined as never);
  await GET(new Request('http://test/api/availability/slots?past=true&page=2'), undefined as never); await POST(undefined as never, undefined as never); await DELETE(undefined as never, undefined as never);
  expect(state.list).toHaveBeenCalledWith({ page: undefined, past: undefined }); expect(state.list).toHaveBeenLastCalledWith({ page: '2', past: 'true' }); expect(state.publish).toHaveBeenCalledWith({ startsAt: 'instant' }); expect(state.remove).toHaveBeenCalledWith('slot');
});
