import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import type { Locale } from '../../lib/i18n/routing';

interface ScrollRegionProps {
  locale: Locale;
  label: string;
  className?: string;
  children: ReactNode;
}

/** Preserve diagram text size and reveal the native scroll affordance only when needed. */
export function ScrollRegion({ locale, label, className = '', children }: ScrollRegionProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const hintId = useId();
  const [overflows, setOverflows] = useState(false);
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const measure = () => setOverflows(viewport.scrollWidth > viewport.clientWidth + 1);
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    if (viewport.firstElementChild) observer.observe(viewport.firstElementChild);
    measure();
    return () => observer.disconnect();
  }, []);

  return <div className={`scroll-region ${className}`} data-overflow={overflows}>
    {overflows ? <p className="scroll-region__hint" id={hintId}>{locale === 'ko'
      ? '↔ 가로로 이동해 전체 도표 보기'
      : '↔ Scroll sideways for the full diagram.'}</p> : null}
    <div className="scroll-region__viewport" ref={viewportRef} tabIndex={0} role="region" aria-label={label}
      aria-describedby={overflows ? hintId : undefined}>
      {children}
    </div>
  </div>;
}
