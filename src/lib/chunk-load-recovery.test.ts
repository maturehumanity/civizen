import { describe, expect, it } from 'vitest';

import { getErrorMessage, isChunkLoadError } from '@/lib/chunk-load-recovery';

describe('chunk-load-recovery', () => {
  it('detects Vite dynamic import failures', () => {
    expect(
      isChunkLoadError(
        new Error('Failed to fetch dynamically imported module: https://civizen.world/assets/toaster-D2zzfb8g.js'),
      ),
    ).toBe(true);
    expect(isChunkLoadError(new Error('Loading chunk 17 failed'))).toBe(true);
    expect(isChunkLoadError(new Error('ChunkLoadError'))).toBe(true);
  });

  it('ignores unrelated errors', () => {
    expect(isChunkLoadError(new Error('Cannot read properties of undefined'))).toBe(false);
    expect(isChunkLoadError('network offline')).toBe(false);
  });

  it('stringifies unknown reasons safely', () => {
    expect(getErrorMessage({ code: 42 })).toContain('42');
  });
});
