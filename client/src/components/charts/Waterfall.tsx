import { useState } from 'react';
import { niceTicks, Tooltip, useWidth } from './core';

interface Step {
  id: string;
  label: string;
  value: number;
  color: string;
}

interface Props {
  steps: Step[];
  totalLabel: string;
  budget: number;
  height?: number;
  format: (v: number) => string;
  shortFormat: (v: number) => string;
  ariaLabel: string;
}

/**
 * Daily consolidation as a build-up: each category stacks onto the running total,
 * ending in the day's total, with the planned daily cost as a reference line.
 */
export function Waterfall({ steps, totalLabel, budget, height = 260, format, shortFormat, ariaLabel }: Props) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);

  const total = steps.reduce((s, x) => s + x.value, 0);
  const ticks = niceTicks(0, Math.max(total, budget) * 1.08, 4);
  const hi = ticks[ticks.length - 1];
  const m = { t: 22, r: 12, b: 30, l: 60 };
  const iw = width - m.l - m.r;
  const ih = height - m.t - m.b;
  const n = steps.length + 1;
  const band = iw / n;
  const bw = Math.min(64, band * 0.6);
  const py = (v: number) => m.t + ih - (v / hi) * ih;

  let run = 0;
  const bars = steps.map((s, i) => {
    const from = run;
    run += s.value;
    return { ...s, from, to: run, i };
  });
  const over = total > budget;

  return (
    <div className="chart" ref={ref}>
      <svg width={width} height={height} role="img" aria-label={ariaLabel}>
        {ticks.map((t) => (
          <g key={t}>
            <line className="grid-line" x1={m.l} x2={width - m.r} y1={py(t)} y2={py(t)} />
            <text x={m.l - 8} y={py(t)} dy="0.32em" textAnchor="end">
              {shortFormat(t)}
            </text>
          </g>
        ))}

        {bars.map((b) => {
          const cx = m.l + band * b.i + band / 2;
          const nextCx = m.l + band * (b.i + 1) + band / 2;
          return (
            <g key={b.id} opacity={hover !== null && hover !== b.i ? 0.55 : 1}>
              <rect x={cx - bw / 2} y={py(b.to)} width={bw} height={Math.max(1, py(b.from) - py(b.to))} fill={b.color} rx={2} />
              <line x1={cx + bw / 2} x2={nextCx - bw / 2} y1={py(b.to)} y2={py(b.to)} stroke="var(--ink-4)" strokeWidth={1} />
              {py(b.from) - py(b.to) > 0 && (
                <text x={cx} y={py(b.to) - 6} textAnchor="middle" style={{ fill: 'var(--ink-2)' }}>
                  {shortFormat(b.value)}
                </text>
              )}
              <text x={cx} y={height - 10} textAnchor="middle">
                {b.label}
              </text>
              <rect
                x={m.l + band * b.i}
                y={m.t}
                width={band}
                height={ih}
                fill="transparent"
                onPointerEnter={() => setHover(b.i)}
                onPointerLeave={() => setHover(null)}
              />
            </g>
          );
        })}

        {/* Total bar */}
        {(() => {
          const cx = m.l + band * steps.length + band / 2;
          return (
            <g opacity={hover !== null && hover !== steps.length ? 0.55 : 1}>
              <rect x={cx - bw / 2} y={py(total)} width={bw} height={py(0) - py(total)} fill="var(--ink)" rx={3} />
              <text x={cx} y={py(total) - 6} textAnchor="middle" className="lbl">
                {shortFormat(total)}
              </text>
              <text x={cx} y={height - 10} textAnchor="middle" style={{ fill: 'var(--ink)', fontWeight: 600 }}>
                {totalLabel}
              </text>
              <rect
                x={m.l + band * steps.length}
                y={m.t}
                width={band}
                height={ih}
                fill="transparent"
                onPointerEnter={() => setHover(steps.length)}
                onPointerLeave={() => setHover(null)}
              />
            </g>
          );
        })()}

        <line x1={m.l} x2={width - m.r} y1={py(budget)} y2={py(budget)} stroke={over ? 'var(--over-mark)' : 'var(--good-mark)'} strokeWidth={1.5} />
        <text x={m.l + 4} y={py(budget) - 6} style={{ fill: over ? 'var(--over)' : 'var(--good)', fontWeight: 600 }}>
          Planned {shortFormat(budget)}
        </text>
        <line className="axis-line" x1={m.l} x2={width - m.r} y1={py(0)} y2={py(0)} />
      </svg>
      {hover !== null && (
        <Tooltip
          x={Math.min(Math.max(m.l + band * hover + band / 2, 100), width - 100)}
          y={Math.max(60, py(hover < steps.length ? bars[hover].to : total))}
          title={hover < steps.length ? bars[hover].label : totalLabel}
          rows={
            hover < steps.length
              ? [
                  { label: 'Cost', value: format(bars[hover].value), color: bars[hover].color },
                  { label: 'Share of day', value: `${((bars[hover].value / total) * 100).toFixed(1)}%` },
                  { label: 'Running total', value: format(bars[hover].to) },
                ]
              : [
                  { label: 'Actual', value: format(total) },
                  { label: 'Planned', value: format(budget) },
                  { label: 'Variance', value: `${total - budget >= 0 ? '+' : '−'}${format(Math.abs(total - budget))}` },
                ]
          }
        />
      )}
    </div>
  );
}
