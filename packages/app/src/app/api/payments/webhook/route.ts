import { apiHandler, isAppError } from '@devmentor/core';
import { withPaymentScope as withScope } from '../../../../lib/payments/scope';
import { readWebhookBody } from '../../../../lib/payments/webhook-body';

export const dynamic = 'force-dynamic';
/** Every path is plain HTTP, including SDK/config/database failure responses. */
export const POST = apiHandler(async req => {
  try {
    const raw = await readWebhookBody(req);
    await withScope(async cradle => {
      const event = cradle.paymentGateway.verifyWebhook(raw, req.headers.get('stripe-signature') ?? '');
      await cradle.paymentService.handleEvent(event);
    });
    return new Response(null, { status: 200 });
  } catch (error) {
    return new Response(null, { status: isAppError(error) ? error.status : 500 });
  }
}, { csrf: false });
