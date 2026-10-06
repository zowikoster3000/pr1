import { describe, expect, it } from 'vitest';
import { clientKey, RateLimiter } from './rate-limit';

describe('RateLimiter', () => {
  it('allows bursts up to capacity, then refills over time', () => {
    let now = 0;
    const rl = new RateLimiter(2, 1, () => now);
    expect(rl.take('a').ok).toBe(true);
    expect(rl.take('a').ok).toBe(true);
    expect(rl.take('a')).toEqual({ ok: false, retryAfterSeconds: 1 });
    expect(rl.take('b').ok).toBe(true);
    now = 1000;
    expect(rl.take('a').ok).toBe(true);
  });

  it('uses the left-most forwarded address', () => {
    expect(clientKey(new Headers({ 'x-forwarded-for': '1.2.3.4, 10.0.0.1' }))).toBe('1.2.3.4');
  });
});
