import { makeOwnedCollectionRoute } from '@devmentor/core';
import { slotCreateSchema } from '@devmentor/core/validators/availability/slot-create.schema';

const handlers = makeOwnedCollectionRoute({
  role: 'mentor',
  list: (cradle, req) => {
    const query = new URL(req.url).searchParams;
    return cradle.slotService.list({ page: query.get('page') ?? undefined, past: query.get('past') ?? undefined });
  },
  createSchema: slotCreateSchema,
  create: (cradle, input) => cradle.slotService.publish(input),
  remove: (cradle, params) => cradle.slotService.remove(String(params.id)),
});
export const GET = handlers.GET;
export const POST = handlers.POST;
export const DELETE = handlers.DELETE;




