import { createRef } from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useDragToScroll } from '@/hooks/useDragToScroll';

function DragHost({
  scrollRef,
}: {
  scrollRef: React.RefObject<HTMLDivElement | null>;
}) {
  useDragToScroll(scrollRef);
  return (
    <div
      ref={scrollRef}
      data-testid="drag-scroll"
      style={{ width: 120, height: 80, overflow: 'auto' }}
    >
      <div style={{ width: 400, height: 200 }}>wide</div>
    </div>
  );
}

function dispatchPointer(
  el: HTMLElement,
  type: string,
  init: { button?: number; clientX: number; clientY: number; pointerId: number },
) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.assign(event, {
    button: init.button ?? 0,
    clientX: init.clientX,
    clientY: init.clientY,
    pointerId: init.pointerId,
  });
  el.dispatchEvent(event);
}

describe('useDragToScroll', () => {
  it('pans the scroller when the pointer drags', () => {
    const scrollRef = createRef<HTMLDivElement>();
    render(<DragHost scrollRef={scrollRef} />);
    const el = scrollRef.current!;
    expect(el).toBeTruthy();

    // jsdom lacks setPointerCapture; stub so drag can proceed.
    el.setPointerCapture = () => {};
    el.releasePointerCapture = () => {};
    el.hasPointerCapture = () => false;

    dispatchPointer(el, 'pointerdown', { clientX: 100, clientY: 40, pointerId: 1 });
    dispatchPointer(el, 'pointermove', { clientX: 60, clientY: 40, pointerId: 1 });

    expect(el.scrollLeft).toBeGreaterThan(0);
    expect(el.dataset.dragging).toBe('true');

    dispatchPointer(el, 'pointerup', { clientX: 60, clientY: 40, pointerId: 1 });
    expect(el.dataset.dragging).toBeUndefined();
  });
});
