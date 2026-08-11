import { useEffect, useRef, useState, type RefObject } from 'react';

import { preferBudgetStructureWideLayout } from '@/lib/finance/budget-presentation';

/** Observe usable panel width to choose hierarchical table vs stacked cards. */
export function useBudgetStructureWideLayout(): {
  containerRef: RefObject<HTMLDivElement | null>;
  isWide: boolean;
  widthPx: number | null;
} {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [widthPx, setWidthPx] = useState<number | null>(null);

  useEffect(() => {
    const node = containerRef.current;
    if (!node || typeof ResizeObserver === 'undefined') {
      setWidthPx(typeof window !== 'undefined' ? window.innerWidth : null);
      return;
    }
    const update = () => setWidthPx(node.getBoundingClientRect().width);
    update();
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      setWidthPx(entry.contentRect.width);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return {
    containerRef,
    isWide: preferBudgetStructureWideLayout(widthPx),
    widthPx,
  };
}
