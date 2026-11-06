import { expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ configure: vi.fn(), adapter: vi.fn(), scope: vi.fn(), request: vi.fn() }));
vi.mock('@devmentor/core', () => ({ configurePaymentGatewayFactory: state.configure, withScope: state.scope, withRequestScope: state.request }));
vi.mock('./stripe-payment-gateway', () => ({ StripePaymentGateway: class { constructor(env: unknown) { state.adapter(env); } } }));
import { withPaymentScope, withPaymentRequestScope } from './scope';
it('configures the host gateway lazily and preserves scoped request lifecycle', async () => {
  const fn = vi.fn(); const req = new Request('http://test');
  await withPaymentScope(fn); await withPaymentRequestScope(req, fn);
  expect(state.scope).toHaveBeenCalledWith(fn); expect(state.request).toHaveBeenCalledWith(req, fn);
  expect(state.adapter).not.toHaveBeenCalled();
  state.configure.mock.calls[0]![0]({ STRIPE_SECRET_KEY: 'synthetic' });
  expect(state.adapter).toHaveBeenCalledWith({ STRIPE_SECRET_KEY: 'synthetic' });
});
