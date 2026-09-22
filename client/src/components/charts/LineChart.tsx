import { useState } from 'react';
import { niceTicks, Tooltip, useWidth } from './core';

export interface LineSeries {
  id: string;
  label: string;
  color: string;
  values: (number | null)[];
  dashed?: boolean;
  /** Draw point markers on real (non-null) values */
  markers?: boolean;
  /** Label the last point directly */
  endLabel?: boolean;
  /** Shade the area under this series */
  area?: boolean;
  /** Optional fractional x position per value (defaults to its index) */
  positions?: number[];
}

interface Props {
  x: string[];
  xTooltip?: string[];
  series: LineSeries[];
  height?: number;
  yFormat: (v: number) => string;
  tipFormat?: (v: number) => string;
  yMin?: number;
  yMax?: number;
  /** Fractional x index of "today" */
  today?: number;
  todayLabel?: string;
  /** Horizontal reference line */
  refLine?: { value: number; label: string };
  ariaLabel: string;
}

export function LineChart({
  x,
  xTooltip,
  series,
  height = 280,
  yFormat,
  tipFormat,
  yMin,
  yMax,
  today,
  todayLabel = 'Today',
  refLine,
  ariaLabel,
}: Props) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);

  const all = series.flatMap((s) => s.values.filter((v): v is number => v !== null));
  if (refLine) all.push(refLine.value);
  const ticks = niceTicks(yMin ?? Math.min(0, ...all), yMax ?? Math.max(...all), 5);
  const lo = ticks[0];
  const hi = ticks[ticks.length - 1];

  const hasEnd = series.some((s) => s.endLabel);
  const m = { t: 16, r: hasEnd ? 92 : 16, b: 28, l: 64 };
  const iw = width - m.l - m.r;
  const ih = height - m.t - m.b;
  const step = x.length > 1 ? iw / (x.length - 1) : iw;
  const px = (i: number) => m.l + i * step;
  const py = (v: number) => m.t + ih - ((v - lo) / (hi - lo)) * ih;

  const sx = (s: LineSeries, i: number) => px(s.positions?.[i] ?? i);

  const pathFor = (s: LineSeries) => {
    const vals = s.values;
    let d = '';
    let pen = false;
    vals.forEach((v, i) => {
      if (v === null) {
        pen = false;
        return;
      }
      d += `${pen ? 'L' : 'M'}${sx(s, i).toFixed(1)},${py(v).toFixed(1)}`;
      pen = true;
    });
    return d;
  };

  const areaFor = (s: LineSeries) => {
    const pts = s.values.map((v, i) => (v === null ? null : [sx(s, i), py(v)])).filter(Boolean) as number[][];
    if (pts.length < 2) return '';
    return `M${pts[0][0]},${py(lo)}` + pts.map((p) => `L${p[0]},${p[1]}`).join('') + `L${pts[pts.length - 1][0]},${py(lo)}Z`;
  };

  // Avoid colliding end labels: sort by y and push apart
  const endLabels = series
    .filter((s) => s.endLabel)
    .map((s) => {
      const idx = s.values.map((v, i) => (v === null ? -1 : i)).filter((i) => i >= 0).pop() ?? 0;
      return { s, idx, y: py(s.values[idx] ?? 0) };
    })
    .sort((a, b) => a.y - b.y);
  for (let i = 1; i < endLabels.length; i++) {
    if (endLabels[i].y - endLabels[i - 1].y < 32) endLabels[i].y = endLabels[i - 1].y + 32;
  }

  const labelEvery = Math.ceil(x.length / Math.max(2, Math.floor(iw / 56)));

  const onMove = (e: React.PointerEvent<SVGRectElement>) => {
    const r = (e.currentTarget as SVGRectElement).getBoundingClientRect();
    const i = Math.round((e.clientX - r.left) / step);
    setHover(Math.max(0, Math.min(x.length - 1, i)));
  };

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
        <line className="axis-line" x1={m.l} x2={width - m.r} y1={py(lo)} y2={py(lo)} />
        {x.map((l, i) =>
          i % labelEvery === 0 || i === x.length - 1 ? (
            <text key={i} x={px(i)} y={height - 8} textAnchor="middle">
              {l}
            </text>
          ) : null,
        )}

        {refLine && (
          <g>
            <line x1={m.l} x2={width - m.r} y1={py(refLine.value)} y2={py(refLine.value)} stroke="var(--ink-3)" strokeWidth={1} />
            <text x={m.l + 6} y={py(refLine.value) - 6} className="lbl" style={{ fontSize: 11 }}>
              {refLine.label}
            </text>
          </g>
        )}

        {today !== undefined && (
          <g>
            <line className="today-line" x1={px(today)} x2={px(today)} y1={m.t} y2={py(lo)} />
            <text x={px(today) + 5} y={m.t + 8} style={{ fill: 'var(--accent)', fontWeight: 600 }}>
              {todayLabel}
            </text>
          </g>
        )}

        {series.map(
          (s) =>
            s.area && <path key={`${s.id}-a`} d={areaFor(s)} fill={s.color} opacity={0.08} />,
        )}
        {series.map((s) => (
          <path
            key={s.id}
            d={pathFor(s)}
            fill="none"
            stroke={s.color}
            strokeWidth={2}
            strokeDasharray={s.dashed ? '6 5' : undefined}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}
        {series.map(
          (s) =>
            s.markers &&
            s.values.map((v, i) =>
              v === null ? null : (
                <circle key={`${s.id}-${i}`} cx={sx(s, i)} cy={py(v)} r={3.5} fill={s.color} stroke="var(--surface)" strokeWidth={2} />
              ),
            ),
        )}

        {endLabels.map(({ s, idx, y }) => (
          <g key={`${s.id}-end`}>
            <text x={sx(s, idx) + 10} y={y - 3} className="lbl">
              {s.label}
            </text>
            <text x={sx(s, idx) + 10} y={y + 11}>
              {yFormat(s.values[idx] ?? 0)}
            </text>
          </g>
        ))}

        {hover !== null && (
          <g>
            <line className="cross" x1={px(hover)} x2={px(hover)} y1={m.t} y2={py(lo)} />
            {series.map((s) =>
              s.values[hover] === null ? null : (
                <circle key={s.id} cx={sx(s, hover)} cy={py(s.values[hover]!)} r={4.5} fill={s.color} stroke="var(--surface)" strokeWidth={2} />
              ),
            )}
          </g>
        )}

        <rect
          x={m.l - step / 2}
          y={m.t}
          width={iw + step}
          height={ih}
          fill="transparent"
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
        />
      </svg>
      {hover !== null && (
        <Tooltip
          x={Math.min(Math.max(px(hover), 100), width - 100)}
          y={m.t + 8}
          title={(xTooltip ?? x)[hover]}
          rows={series
            .filter((s) => s.values[hover] !== null)
            .map((s) => ({ label: s.label, value: tf(s.values[hover]!), color: s.color, dashed: s.dashed }))}
        />
      )}
    </div>
  );
}
