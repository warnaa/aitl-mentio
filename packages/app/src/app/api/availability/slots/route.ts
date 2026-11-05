import { makeOwnedCollectionRoute } from '@devmentor/core';
import { slotCreateSchema } from '@devmentor/core/validators/availability/slot-create.schema';
export const dynamic = 'force-dynamic';
const handlers = makeOwnedCollectionRoute({
  role: 'mentor',
  list: cradle => cradle.slotService.list(),
  createSchema: slotCreateSchema,
  create: (cradle, input) => cradle.slotService.publish(input),
  remove: (cradle, params) => cradle.slotService.remove(String(params.id)),
});
export const GET = handlers.GET;
export const POST = handlers.POST;
export const DELETE = handlers.DELETE;
