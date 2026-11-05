import { ownedAction, parseJsonBody } from '@devmentor/core';
import { mentorPricesUpdateSchema } from '@devmentor/core/validators/mentors/mentor-prices-update.schema';
export const dynamic = 'force-dynamic';
export const PUT = ownedAction({ role: 'mentor', run: async (cradle, _params, req) => cradle.mentorProfileService.updatePrices(await parseJsonBody(req, mentorPricesUpdateSchema)) });
