import { ValidationError } from '../http/errors';

declare const centsBrand: unique symbol;
export type Cents = number & { readonly [centsBrand]: true };
export interface PriceBounds { minCents: number; maxCents: number }
export const MAX_CENTS = 2_147_483_647;
/** Bounded string arithmetic: no floating-point multiplication or rounding. */
export function parseMajorAmount(value: string): Cents {
  if (value.length > 11 || !/^(0|[1-9]\d*)(\.\d{1,2})?$/.test(value)) throw new ValidationError('Enter an amount with at most two decimal places.');
  const [whole, fraction = ''] = value.split('.');
  const minor = BigInt(whole!) * 100n + BigInt(fraction.padEnd(2, '0'));
  if (minor > BigInt(MAX_CENTS)) throw new ValidationError('This amount is too large.');
  return Number(minor) as Cents;
}
export function withinBounds(value: number, bounds: PriceBounds): boolean {
  return Number.isInteger(value) && value >= bounds.minCents && value <= bounds.maxCents;
}
