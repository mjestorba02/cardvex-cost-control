import { useState } from 'react';
import { niceTicks, Tooltip, useWidth, type TooltipRow } from './core';

export interface Stack {
  id: string;
  label: string;
  color: string;
}

interface Props {
  x: string[];
  xTooltip?: string[];
  stacks: Stack[];
  /** values[xIndex][stackIndex] */
  values: number[][];
  /** Per-bar target, drawn as a tick across the bar */
  targets?: number[];
  targetLabel?: string;
  height?: number;
  yFormat: (v: number) => string;
  tipFormat?: (v: number) => string;
  selected?: number;
  onSelect?: (i: number) => void;
  extraTip?: (i: number) => TooltipRow[];
  ariaLabel: string;
}

const GAP = 2;

export function StackedBars({
  x,
  xTooltip,
  stacks,
  values,
  targets,
  targetLabel = 'Budget',
  height = 260,
  yFormat,
  tipFormat,
  selected,
  onSelect,
  extraTip,
  ariaLabel,
}: Props) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);

  const totals = values.map((row) => row.reduce((a, b) => a + b, 0));
  const ticks = niceTicks(0, Math.max(...totals, ...(targets ?? [0])) * 1.05, 4);
  const hi = ticks[ticks.length - 1];

  const m = { t: 14, r: 12, b: 28, l: 60 };
  const iw = width - m.l - m.r;
  const ih = height - m.t - m.b;
  const band = iw / x.length;
  const bw = Math.min(56, band * 0.56);
  // Narrow bands: keep only the last token of each label (e.g. "Wed 16" → "16")
  const compact = band < 60;
  const py = (v: number) => m.t + ih - (v / hi) * ih;
  const tf = tipFormat ?? yFormat;

  return (
    <div className="chart" ref={ref}>
      <svg width={width} height={height} role="img" aria-label={ariaLabel}>
        {ticks.map((t) => (
          <g key={t}>
            <line className="grid-line" x1={m.l} x2={width - m.r} y1={py(t)} y2={py(t)} />
            <text x={m.l - 8} y={py(t)} dy="0.32em" textAnchor="end">
              {yFormat(t)}
            </text>
          </g>
        ))}

        {x.map((label, i) => {
          const cx = m.l + band * i + band / 2;
          let acc = 0;
          const isSel = selected === i;
          const dim = (hover !== null && hover !== i) || (selected !== undefined && !isSel && hover === null);
          return (
            <g key={label + i} opacity={dim ? 0.55 : 1} style={{ transition: 'opacity 160ms' }}>
              {values[i].map((v, k) => {
                if (v <= 0) return null;
                const y0 = py(acc);
                acc += v;
                const y1 = py(acc);
                const h = Math.max(0, y0 - y1 - (acc === v ? 0 : GAP));
                const isTop = k === values[i].reduce((last, val, idx) => (val > 0 ? idx : last), 0);
                return (
                  <rect
                    key={k}
                    x={cx - bw / 2}
                    y={y1}
                    width={bw}
                    height={h}
                    fill={stacks[k].color}
                    rx={isTop ? 3 : 0}
                  />
                );
              })}
              {targets && (
                <line
                  x1={cx - bw / 2 - 6}
                  x2={cx + bw / 2 + 6}
                  y1={py(targets[i])}
                  y2={py(targets[i])}
                  stroke="var(--ink)"
                  strokeWidth={2}
                />
              )}
              <text x={cx} y={height - 8} textAnchor="middle" style={isSel ? { fill: 'var(--ink)', fontWeight: 600 } : undefined}>
                {compact ? label.split(' ').pop() : label}
              </text>
              <rect
                x={m.l + band * i}
                y={m.t}
                width={band}
                height={ih}
                fill="transparent"
                style={{ cursor: onSelect ? 'pointer' : undefined }}
                onPointerEnter={() => setHover(i)}
                onPointerLeave={() => setHover(null)}
                onClick={() => onSelect?.(i)}
              />
            </g>
          );
        })}
        <line className="axis-line" x1={m.l} x2={width - m.r} y1={py(0)} y2={py(0)} />
      </svg>
      {hover !== null && (
        <Tooltip
          x={Math.min(Math.max(m.l + band * hover + band / 2, 100), width - 100)}
          y={Math.max(py(totals[hover]), 60)}
          title={(xTooltip ?? x)[hover]}
          rows={[
            ...stacks
              .map((s, k) => ({ label: s.label, value: tf(values[hover][k]), color: s.color }))
              .filter((_, k) => values[hover][k] > 0)
              .reverse(),
            { label: 'Total', value: tf(totals[hover]) },
            ...(targets ? [{ label: targetLabel, value: tf(targets[hover]) }] : []),
            ...(extraTip ? extraTip(hover) : []),
          ]}
        />
      )}
    </div>
  );
}
