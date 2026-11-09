import { z } from 'zod';
import { MAX_CENTS } from '../../money/money';
import { exactMajorDecimalString } from '../mentors/mentor-prices-update.schema';

const AMOUNT_FIELDS = ['price25Min', 'price25Max', 'price50Min', 'price50Max'] as const;
type AmountField = (typeof AMOUNT_FIELDS)[number];

/** Exact decimal → integer minor units, without floating-point arithmetic (as `parseMajorAmount`). */
function toCents(value: string): number {
  const [whole, fraction = ''] = value.split('.');
  return Number(BigInt(whole!) * 100n + BigInt(fraction.padEnd(2, '0')));
}

/**
 * The operator's settings form (E05-S02). Amounts are major-unit decimals like the mentor price
 * form and come out as integer cents; each bound must be positive and storable, and each
 * minimum at most its maximum (the error sits on the maximum). The fee is a whole percent.
 * `version` is the value the form was loaded with, for the optimistic concurrency check.
 * Currency is not accepted: it is PLN until a separate product decision (R21).
 */
export const platformSettingsUpdateSchema = z
  .object({
    price25Min: exactMajorDecimalString,
    price25Max: exactMajorDecimalString,
    price50Min: exactMajorDecimalString,
    price50Max: exactMajorDecimalString,
    feePercent: z.number().int('Enter a whole percent.').min(0, 'Enter a fee from 0 to 100%.').max(100, 'Enter a fee from 0 to 100%.'),
    version: z.number().int().min(0),
  })
  .transform((input, ctx) => {
    const cents = {} as Record<AmountField, number>;
    for (const field of AMOUNT_FIELDS) {
      const value = toCents(input[field]);
      if (value <= 0) ctx.addIssue({ code: 'custom', path: [field], message: 'Enter an amount above zero.' });
      else if (value > MAX_CENTS) ctx.addIssue({ code: 'custom', path: [field], message: 'This amount is too large.' });
      cents[field] = value;
    }
    for (const [min, max] of [['price25Min', 'price25Max'], ['price50Min', 'price50Max']] as const) {
      if (cents[min] > cents[max]) ctx.addIssue({ code: 'custom', path: [max], message: `The maximum must be at least the minimum (${(cents[min] / 100).toFixed(2)}).` });
    }
    return {
      priceBounds: {
        p25: { minCents: cents.price25Min, maxCents: cents.price25Max },
        p50: { minCents: cents.price50Min, maxCents: cents.price50Max },
      },
      feePercent: input.feePercent,
      version: input.version,
    };
  });

export type PlatformSettingsUpdateInput = z.input<typeof platformSettingsUpdateSchema>;
export type PlatformSettingsUpdate = z.output<typeof platformSettingsUpdateSchema>;
