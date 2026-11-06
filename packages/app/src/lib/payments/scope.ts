import { configurePaymentGatewayFactory, withScope, withRequestScope, type Cradle } from '@devmentor/core';
import { StripePaymentGateway } from './stripe-payment-gateway';

/** Explicit host composition, outside Next's Edge instrumentation graph. */
function configure() { configurePaymentGatewayFactory(env => new StripePaymentGateway(env)); }
export function withPaymentScope<T>(fn: (cradle: Cradle) => Promise<T> | T): Promise<T> {
  configure(); return withScope(fn);
}
export function withPaymentRequestScope<T>(req: Request, fn: (cradle: Cradle) => Promise<T> | T): Promise<T> {
  configure(); return withRequestScope(req, fn);
}
