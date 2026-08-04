import { describe, expect, it } from 'vitest';

import { lazyWithChunkReload } from '@/lib/lazy-with-chunk-reload';

describe('lazyWithChunkReload', () => {
  it('wraps a successful factory in a React.lazy exotic component', () => {
    const Lazy = lazyWithChunkReload(async () => ({
      default: function Ok() {
        return null;
      },
    }));

    expect(Lazy).toBeTruthy();
    expect(typeof Lazy).toBe('object');
    expect(String(Lazy.$$typeof)).toContain('react.lazy');
  });
});
