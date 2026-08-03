import { useEffect, useRef, useState } from 'react';

type UseShowOnScrollUpOptions = {
  /** Min px delta before direction changes (reduces jitter). */
  threshold?: number;
  /** Always show the chrome while scrollY is at or below this. */
  topOffset?: number;
};

/**
 * Visibility for auto-hiding sticky chrome: hide on scroll down, show on scroll up.
 * Also reports whether the page has left the top so callers can elevate the bar.
 */
export function useShowOnScrollUp(options: UseShowOnScrollUpOptions = {}) {
  const { threshold = 8, topOffset = 16 } = options;
  const [visible, setVisible] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const lastYRef = useRef(0);

  useEffect(() => {
    lastYRef.current = window.scrollY;
    setScrolled(window.scrollY > topOffset);

    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > topOffset);

      if (y <= topOffset) {
        setVisible(true);
      } else if (y > lastYRef.current + threshold) {
        setVisible(false);
      } else if (y < lastYRef.current - threshold) {
        setVisible(true);
      }

      lastYRef.current = y;
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold, topOffset]);

  return { visible, scrolled };
}
