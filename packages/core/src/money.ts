import { z } from 'zod';

/** Money is always integer minor units (e.g. cents) plus an ISO 4217 code. Never floats. */
export const MoneySchema = z.object({
  amountMinor: z.number().int().nonnegative(),
  currency: z.string().regex(/^[A-Z]{3}$/),
});
export type Money = z.infer<typeof MoneySchema>;

/** Converts a decimal string or number from an external API to minor units without float drift. */
export function toMinor(amount: string | number, fractionDigits = 2): number {
  const str = typeof amount === 'number' ? amount.toFixed(fractionDigits) : amount.trim();
  const match = /^(\d+)(?:\.(\d+))?$/.exec(str);
  if (!match) throw new Error(`Invalid money amount: ${String(amount)}`);
  const whole = match[1]!;
  const frac = (match[2] ?? '').padEnd(fractionDigits, '0');
  if (frac.length > fractionDigits && /[1-9]/.test(frac.slice(fractionDigits))) {
    throw new Error(`Amount has more precision than ${fractionDigits} digits: ${str}`);
  }
  return Number(whole) * 10 ** fractionDigits + Number(frac.slice(0, fractionDigits) || '0');
}

export function formatMoney(money: Money, locale = 'en-GB'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: money.currency,
    maximumFractionDigits: 0,
  }).format(money.amountMinor / 100);
}
