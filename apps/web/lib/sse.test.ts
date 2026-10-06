import { describe, expect, it } from 'vitest';
import { SseParser } from './sse';

describe('SseParser', () => {
  it('handles messages split across chunks', () => {
    const p = new SseParser();
    expect(p.push('event: offers\nda')).toEqual([]);
    expect(p.push('ta: {"a":1}\n\nevent: done\ndata: {}\n\n')).toEqual([
      { event: 'offers', data: '{"a":1}' },
      { event: 'done', data: '{}' },
    ]);
  });
});
