import { describe, expect, it } from 'vitest';
import { splitFee } from './fee';
import { MAX_CENTS } from './money';

describe('splitFee', () => {
  it('takes 20 % of a session and leaves the rest to the mentor', () => {
    expect(splitFee(8000, 20)).toEqual({ feePercentApplied: 20, platformFeeCents: 1600, mentorShareCents: 6400 });
  });

  it('rounds the fee half-up to a whole cent and keeps the sum equal to the price', () => {
    expect(splitFee(8999, 20)).toEqual({ feePercentApplied: 20, platformFeeCents: 1800, mentorShareCents: 7199 });
    expect(splitFee(1, 50)).toEqual({ feePercentApplied: 50, platformFeeCents: 1, mentorShareCents: 0 });
    expect(splitFee(1, 49)).toEqual({ feePercentApplied: 49, platformFeeCents: 0, mentorShareCents: 1 });
    expect(splitFee(333, 15)).toEqual({ feePercentApplied: 15, platformFeeCents: 50, mentorShareCents: 283 });
  });

  it('handles the 0 % and 100 % edges', () => {
    expect(splitFee(5000, 0)).toEqual({ feePercentApplied: 0, platformFeeCents: 0, mentorShareCents: 5000 });
    expect(splitFee(5000, 100)).toEqual({ feePercentApplied: 100, platformFeeCents: 5000, mentorShareCents: 0 });
  });

  it('stays exact at the largest storable price', () => {
    const split = splitFee(MAX_CENTS, 33);
    expect(split.platformFeeCents + split.mentorShareCents).toBe(MAX_CENTS);
    expect(split.platformFeeCents).toBe(708_669_604);
  });

  it.each([0, -1, 1.5, MAX_CENTS + 1, Number.NaN])('refuses the price %s', price => {
    expect(() => splitFee(price, 20)).toThrow(RangeError);
  });

  it.each([-1, 101, 20.5, Number.NaN])('refuses the fee %s', fee => {
    expect(() => splitFee(8000, fee)).toThrow(RangeError);
  });
});
