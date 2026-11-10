import { MAX_CENTS } from './money';

export interface FeeSplit {
  feePercentApplied: number;
  platformFeeCents: number;
  mentorShareCents: number;
}

/**
 * R10: the platform fee is a whole percent of the session price, rounded half-up to a whole cent
 * in integer arithmetic; the mentor's share is the remainder, so the two always sum to the price.
 */
export function splitFee(priceCents: number, feePercent: number): FeeSplit {
  if (!Number.isInteger(priceCents) || priceCents <= 0 || priceCents > MAX_CENTS) throw new RangeError('Price must be a positive whole number of cents.');
  if (!Number.isInteger(feePercent) || feePercent < 0 || feePercent > 100) throw new RangeError('Fee must be a whole percent from 0 to 100.');
  const platformFeeCents = Number((BigInt(priceCents) * BigInt(feePercent) + 50n) / 100n);
  return { feePercentApplied: feePercent, platformFeeCents, mentorShareCents: priceCents - platformFeeCents };
}
