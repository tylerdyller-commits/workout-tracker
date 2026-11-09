import { useEffect, useRef, type ReactNode } from 'react';

export interface ScrollRequest {
  index: number;
  smooth: boolean;
  /** Bump to repeat a request for the same index. */
  seq: number;
}

/**
 * Horizontal pager: one full-height card per exercise, scroll-snapped, with
 * the next card peeking in. Reports which card is in view and scrolls to a
 * card when `scrollRequest` changes.
 */
export default function ExerciseCarousel({
  children,
  count,
  initialIndex = 0,
  onIndexChange,
  scrollRequest,
}: {
  children: ReactNode;
  count: number;
  /** Card to show when first opened (no animation). */
  initialIndex?: number;
  onIndexChange: (index: number) => void;
  scrollRequest: ScrollRequest | null;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const lastIndex = useRef(-1);

  const cardLeft = (el: HTMLDivElement, i: number) => {
    const card = el.children[i] as HTMLElement | undefined;
    // .carousel is position: relative, so offsetLeft is measured from it
    return card ? card.offsetLeft - parseFloat(getComputedStyle(el).paddingLeft) : 0;
  };

  const currentIndex = (el: HTMLDivElement) => {
    if (count <= 1) return 0;
    // at the far right edge, the last card is the one in view
    if (el.scrollLeft >= el.scrollWidth - el.clientWidth - 4) return count - 1;
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < count; i++) {
      const d = Math.abs(cardLeft(el, i) - el.scrollLeft);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    }
    return best;
  };

  const onScroll = () => {
    const el = ref.current;
    if (!el) return;
    const i = currentIndex(el);
    if (i !== lastIndex.current) {
      lastIndex.current = i;
      onIndexChange(i);
    }
  };

  const initial = useRef(initialIndex);
  useEffect(() => {
    const el = ref.current;
    if (el && initial.current > 0) el.scrollLeft = cardLeft(el, initial.current);
    // run once, on mount
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || !scrollRequest) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    el.scrollTo({
      left: cardLeft(el, scrollRequest.index),
      behavior: scrollRequest.smooth && !reduce ? 'smooth' : 'auto',
    });
  }, [scrollRequest]);

  return (
    <div className="carousel" ref={ref} onScroll={onScroll}>
      {children}
    </div>
  );
}
