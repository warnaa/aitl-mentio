import { ownedAction } from '@devmentor/core';
export const dynamic = 'force-dynamic';
export const DELETE = ownedAction({ role: 'mentor', run: (cradle, params) => cradle.slotService.remove(String(params.id)) });
