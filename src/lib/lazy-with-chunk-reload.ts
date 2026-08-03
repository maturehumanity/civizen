import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

import { isChunkLoadError, reloadForNewDeployment } from '@/lib/chunk-load-recovery';

type AnyComponent = ComponentType<Record<string, never>> | ComponentType<Record<string, unknown>>;

/**
 * Like React.lazy, but one failed dynamic import after a deploy triggers a
 * document reload for a fresh asset graph instead of a stuck crash screen.
 */
export function lazyWithChunkReload<T extends AnyComponent>(
  factory: () => Promise<{ default: T }>,
): LazyExoticComponent<T> {
  return lazy(async () => {
    try {
      return await factory();
    } catch (error) {
      if (isChunkLoadError(error) && reloadForNewDeployment(error)) {
        // Keep Suspense pending until the navigation completes.
        return new Promise(() => undefined);
      }
      throw error;
    }
  });
}
