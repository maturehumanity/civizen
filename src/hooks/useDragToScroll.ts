import { type RefObject, useEffect } from 'react';

const DRAG_THRESHOLD_PX = 4;

/**
 * Pointer drag pans an overflow scroller (desktop mouse drag / pen).
 * Ignores drags that start on interactive controls so clicks still work.
 */
export function useDragToScroll(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let pointerId: number | null = null;
    let startX = 0;
    let startY = 0;
    let originLeft = 0;
    let originTop = 0;
    let dragging = false;

    const isInteractive = (target: EventTarget | null) => {
      if (!(target instanceof Element)) return false;
      return Boolean(target.closest('button, a, input, textarea, select, label, [role="button"]'));
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0 || isInteractive(event.target)) return;
      pointerId = event.pointerId;
      startX = event.clientX;
      startY = event.clientY;
      originLeft = el.scrollLeft;
      originTop = el.scrollTop;
      dragging = false;
    };

    const onPointerMove = (event: PointerEvent) => {
      if (pointerId !== event.pointerId) return;
      const dx = event.clientX - startX;
      const dy = event.clientY - startY;
      if (!dragging) {
        if (Math.abs(dx) < DRAG_THRESHOLD_PX && Math.abs(dy) < DRAG_THRESHOLD_PX) return;
        dragging = true;
        try {
          el.setPointerCapture(pointerId);
        } catch {
          // Some environments lack pointer capture; scroll still works.
        }
        el.dataset.dragging = 'true';
      }
      el.scrollLeft = originLeft - dx;
      el.scrollTop = originTop - dy;
      event.preventDefault();
    };

    const endDrag = (event: PointerEvent) => {
      if (pointerId !== event.pointerId) return;
      pointerId = null;
      dragging = false;
      delete el.dataset.dragging;
      if (el.hasPointerCapture(event.pointerId)) {
        el.releasePointerCapture(event.pointerId);
      }
    };

    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', endDrag);
    el.addEventListener('pointercancel', endDrag);

    return () => {
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', endDrag);
      el.removeEventListener('pointercancel', endDrag);
    };
  }, [ref]);
}
