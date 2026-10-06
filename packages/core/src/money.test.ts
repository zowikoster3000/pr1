import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { formatMoney, toMinor } from './money';

describe('toMinor', () => {
  it('parses decimal strings exactly', () => {
    expect(toMinor('123.45')).toBe(12345);
    expect(toMinor('0.1')).toBe(10);
    expect(toMinor('19')).toBe(1900);
    expect(toMinor(350)).toBe(35000);
  });

  it('rejects garbage and over-precise input', () => {
    expect(() => toMinor('-1')).toThrow();
    expect(() => toMinor('1e3')).toThrow();
    expect(() => toMinor('1.005')).toThrow();
  });

  it('round-trips any integer cent amount', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 10_000_000 }), (cents) => {
        const str = `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`;
        expect(toMinor(str)).toBe(cents);
      }),
    );
  });
});

describe('formatMoney', () => {
  it('formats whole units with the currency symbol', () => {
    expect(formatMoney({ amountMinor: 12900, currency: 'EUR' })).toBe('€129');
  });
});
