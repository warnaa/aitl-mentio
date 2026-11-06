import { expect, it } from 'vitest';
import { paymentIdSchema, paymentResolutionSchema } from './payment.schema';
it('validates IDs and bounded explicit operator dispositions', () => {
  expect(paymentIdSchema.safeParse('not-id').success).toBe(false);
  expect(paymentResolutionSchema.parse({ action: 'release', reason: ' verified ', sessionId: 'cs', injected: true })).toEqual({ action: 'release', reason: 'verified', sessionId: 'cs' });
  expect(paymentResolutionSchema.safeParse({ action: 'confirm', reason: '' }).success).toBe(false);
  expect(paymentResolutionSchema.safeParse({ action: 'refund', reason: 'x' }).success).toBe(false);
});
