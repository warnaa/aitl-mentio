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

const FEE_MESSAGE = 'Enter a whole percent from 0 to 100.';
const fieldShape = {
  price25Min: exactMajorDecimalString,
  price25Max: exactMajorDecimalString,
  price50Min: exactMajorDecimalString,
  price50Max: exactMajorDecimalString,
  feePercent: z.number({ error: FEE_MESSAGE }).int(FEE_MESSAGE).min(0, FEE_MESSAGE).max(100, FEE_MESSAGE),
};
type Amounts = Record<AmountField, string>;

/** Each bound positive and storable; each minimum at most its maximum (the error sits on the maximum). */
function checkAmounts(input: Amounts, ctx: z.RefinementCtx) {
  // Zod still runs this refinement when a field already failed its own format check; skip those.
  if (AMOUNT_FIELDS.some(field => !exactMajorDecimalString.safeParse(input[field]).success)) return;
  const cents = Object.fromEntries(AMOUNT_FIELDS.map(field => [field, toCents(input[field])])) as Record<AmountField, number>;
  for (const field of AMOUNT_FIELDS) {
    if (cents[field] <= 0) ctx.addIssue({ code: 'custom', path: [field], message: 'Enter an amount above zero.' });
    else if (cents[field] > MAX_CENTS) ctx.addIssue({ code: 'custom', path: [field], message: 'This amount is too large.' });
  }
  for (const [min, max] of [['price25Min', 'price25Max'], ['price50Min', 'price50Max']] as const) {
    if (cents[min] > cents[max]) ctx.addIssue({ code: 'custom', path: [max], message: `The maximum must be at least the minimum (PLN ${(cents[min] / 100).toFixed(2)}).` });
  }
}

/**
 * The operator's settings form fields (E05-S02), validated the same way on the client and the
 * server. Amounts are major-unit decimals like the mentor price form; the fee is a whole percent.
 * Currency is not accepted: it is PLN until a separate product decision (R21).
 */
export const platformSettingsFieldsSchema = z.object(fieldShape).superRefine(checkAmounts);

/**
 * The save request: the form fields plus the `version` the form was loaded with (optimistic
 * concurrency), parsed into the integer-cent policy the service stores.
 */
export const platformSettingsUpdateSchema = z
  .object({ ...fieldShape, version: z.number().int().min(0) })
  .superRefine(checkAmounts)
  .transform(input => ({
    priceBounds: {
      p25: { minCents: toCents(input.price25Min), maxCents: toCents(input.price25Max) },
      p50: { minCents: toCents(input.price50Min), maxCents: toCents(input.price50Max) },
    },
    feePercent: input.feePercent,
    version: input.version,
  }));

export type PlatformSettingsFields = z.infer<typeof platformSettingsFieldsSchema>;
export type PlatformSettingsUpdateInput = z.input<typeof platformSettingsUpdateSchema>;
export type PlatformSettingsUpdate = z.output<typeof platformSettingsUpdateSchema>;
