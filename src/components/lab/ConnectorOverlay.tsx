import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

/**
 * Draws real connecting lines between the matrices.
 *
 * That a result cell C(i, j) comes from row i of the left matrix and column j
 * of the right one used to be hinted at with background colour alone. Drawn as
 * lines, the relationship is simply visible.
 *
 * The coordinates come from measuring the DOM. They cannot be computed once
 * and kept: cell widths depend on the values, fonts arrive late, and on a
 * narrow screen the matrices stack vertically.
 */

export interface AnchorSpec {
  /** The value of the data-matrix attribute */
  matrix: string;
  /** A whole row sets row only, a whole column col only, a single cell both */
  row?: number;
  col?: number;
  /** Which edge of the element the anchor attaches to */
  side: 'left' | 'right';
}

export interface ConnectorLink {
  from: AnchorSpec;
  to: AnchorSpec;
  /** Line colour, given as a CSS variable string */
  color: string;
  /** An accessible description. Supplementary; it does not replace the visual */
  label?: string;
}

interface Point {
  x: number;
  y: number;
}
interface Path {
  d: string;
  color: string;
  key: string;
}

function selectorFor(a: AnchorSpec): string {
  const base = `[data-matrix="${a.matrix}"]`;
  if (a.row !== undefined && a.col !== undefined) {
    return `${base} [data-r="${a.row}"][data-c="${a.col}"]`;
  }
  if (a.row !== undefined) return `${base} [data-r="${a.row}"]`;
  if (a.col !== undefined) return `${base} [data-c="${a.col}"]`;
  return base;
}

/** The union rectangle of several cells (a whole row or column), relative to the container */
function unionRect(container: HTMLElement, selector: string): DOMRect | null {
  const nodes = container.querySelectorAll<HTMLElement>(selector);
  if (nodes.length === 0) return null;
  const base = container.getBoundingClientRect();
  let left = Infinity;
  let top = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;
  nodes.forEach((n) => {
    const r = n.getBoundingClientRect();
    left = Math.min(left, r.left);
    top = Math.min(top, r.top);
    right = Math.max(right, r.right);
    bottom = Math.max(bottom, r.bottom);
  });
  return new DOMRect(left - base.left, top - base.top, right - left, bottom - top);
}

function anchorPoint(rect: DOMRect, side: 'left' | 'right'): Point {
  return {
    x: side === 'left' ? rect.left : rect.right,
    y: rect.top + rect.height / 2,
  };
}

export interface ConnectorOverlayProps {
  containerRef: React.RefObject<HTMLElement | null>;
  links: ConnectorLink[];
  /** Changing any of these triggers a re-measure */
  recomputeKey: string;
}

export function ConnectorOverlay({ containerRef, links, recomputeKey }: ConnectorOverlayProps) {
  const [paths, setPaths] = useState<Path[]>([]);
  const [box, setBox] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const frame = useRef<number | null>(null);

  const measure = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const next: Path[] = [];

    for (let i = 0; i < links.length; i++) {
      const link = links[i];
      const fromRect = unionRect(container, selectorFor(link.from));
      const toRect = unionRect(container, selectorFor(link.to));
      if (!fromRect || !toRect) continue;

      /*
       * Once the matrices stack vertically on a narrow screen, a line would
       * cut straight across the text. Draw only while the source sits to the
       * left of the target.
       */
      if (fromRect.right > toRect.left + 4) continue;

      const a = anchorPoint(fromRect, link.from.side);
      const b = anchorPoint(toRect, link.to.side);
      const dx = Math.max(24, (b.x - a.x) * 0.45);
      next.push({
        d: `M ${a.x} ${a.y} C ${a.x + dx} ${a.y}, ${b.x - dx} ${b.y}, ${b.x} ${b.y}`,
        color: link.color,
        key: `${i}-${link.color}`,
      });
    }

    setBox({ w: rect.width, h: rect.height });
    setPaths(next);
  }, [containerRef, links]);

  /** However many signals arrive, measure once per frame. Breaks the measure-then-setState loop. */
  const schedule = useCallback(() => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      measure();
    });
  }, [measure]);

  // Measure right after paint whenever the selection or the values change
  useLayoutEffect(() => {
    schedule();
  }, [schedule, recomputeKey]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const ro = new ResizeObserver(schedule);
    ro.observe(container);
    // Cell sizes also change when the inner table changes
    container.querySelectorAll('table').forEach((t) => ro.observe(t));

    window.addEventListener('resize', schedule);
    // A late font changes the cell widths
    if (document.fonts?.ready) void document.fonts.ready.then(schedule);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', schedule);
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, [containerRef, schedule]);

  // Server render and the moment before hydration have no coordinates yet; draw nothing.
  if (paths.length === 0 || box.w === 0) return null;

  return (
    <svg
      className="connectors"
      width={box.w}
      height={box.h}
      viewBox={`0 0 ${box.w} ${box.h}`}
      aria-hidden="true"
      focusable="false"
    >
      {paths.map((p) => (
        <path key={p.key} className="connectors__line" d={p.d} stroke={p.color} />
      ))}
    </svg>
  );
}
