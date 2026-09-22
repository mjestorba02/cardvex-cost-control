import { useEffect, useRef, useState, type ReactNode } from 'react';

/** Track an element's content width so SVG renders at 1:1 pixels (crisp text, no scaling). */
export function useWidth<T extends HTMLElement>(fallback = 640) {
  const ref = useRef<T>(null);
  const [w, setW] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(240, Math.floor(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

/** "Nice" axis ticks. */
export function niceTicks(min: number, max: number, count = 5) {
  if (max === min) max = min + 1;
  const span = max - min;
  const raw = span / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => span / s <= count) ?? raw;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Number(v.toFixed(10)));
  return ticks;
}

export interface TooltipRow {
  label: string;
  value: string;
  color?: string;
  dashed?: boolean;
}

export function Tooltip({ x, y, title, rows }: { x: number; y: number; title: string; rows: TooltipRow[] }) {
  return (
    <div className="tooltip" style={{ left: x, top: y }} role="status" aria-live="polite">
      <div className="tooltip__h">{title}</div>
      {rows.map((r) => (
        <div className="tooltip__row" key={r.label}>
          <span>
            {r.color && (
              <i
                style={{
                  width: 10,
                  height: r.dashed ? 2 : 10,
                  borderRadius: 2,
                  background: r.color,
                  display: 'inline-block',
                }}
              />
            )}
            {r.label}
          </span>
          <span className="num">{r.value}</span>
        </div>
      ))}
    </div>
  );
}

export interface LegendItem {
  label: string;
  color: string;
  kind?: 'line' | 'dash' | 'box';
}

export function Legend({ items, children }: { items: LegendItem[]; children?: ReactNode }) {
  return (
    <div className="legend">
      {items.map((i) => (
        <span key={i.label}>
          <i
            className={i.kind === 'dash' ? 'dash' : i.kind === 'box' ? 'box' : undefined}
            style={{ background: i.color, color: i.color }}
          />
          {i.label}
        </span>
      ))}
      {children}
    </div>
  );
}
