import { AlertTriangle, ArrowDownRight, ArrowUpRight, CheckCircle2, Minus, OctagonAlert } from 'lucide-react';
import { severity, type Severity, type Alignment } from '@/lib/calc';
import { pctSigned, phpSigned } from '@/lib/format';

const META: Record<Severity, { label: string; Icon: typeof Minus }> = {
  over: { label: 'Over', Icon: OctagonAlert },
  watch: { label: 'Watch', Icon: AlertTriangle },
  ok: { label: 'Within 5%', Icon: Minus },
  under: { label: 'Under', Icon: CheckCircle2 },
};

/** Variance status: icon + word + (optional) value. Never colour alone. */
export function VarianceTag({ pct, showPct = true }: { pct: number; showPct?: boolean }) {
  const s = severity(pct);
  const { label, Icon } = META[s];
  return (
    <span className={`tag tag--${s}`}>
      <Icon aria-hidden="true" />
      {label}
      {showPct && <span className="num">{pctSigned(pct)}</span>}
    </span>
  );
}

/** Signed variance amount, tinted by severity. Positive = overrun. */
export function Delta({ amount, pct, format = 'php' }: { amount: number; pct: number; format?: 'php' | 'pct' }) {
  const s = severity(pct);
  const Arrow = amount > 0 ? ArrowUpRight : amount < 0 ? ArrowDownRight : Minus;
  return (
    <span className={`delta delta--${s}`}>
      <Arrow size={13} aria-hidden="true" style={{ verticalAlign: '-2px', marginRight: 2 }} />
      {format === 'php' ? phpSigned(amount) : pctSigned(pct)}
    </span>
  );
}

const ALIGN: Record<Alignment, { cls: Severity; label: string; Icon: typeof Minus }> = {
  faster: { cls: 'over', label: 'Spending faster than progress', Icon: ArrowUpRight },
  aligned: { cls: 'ok', label: 'Cost and progress aligned', Icon: Minus },
  slower: { cls: 'under', label: 'Spending slower than progress', Icon: ArrowDownRight },
};

export function AlignmentTag({ value, short }: { value: Alignment; short?: boolean }) {
  const a = ALIGN[value];
  return (
    <span className={`tag tag--${a.cls}`}>
      <a.Icon aria-hidden="true" />
      {short ? (value === 'faster' ? 'Faster' : value === 'slower' ? 'Slower' : 'Aligned') : a.label}
    </span>
  );
}

export function Meter({ value, target, max }: { value: number; target: number; max?: number }) {
  const m = max ?? Math.max(value, target) * 1.1;
  const s = severity(target ? (value - target) / target : 0);
  const cls = s === 'over' ? 'meter__fill meter__fill--over' : s === 'watch' ? 'meter__fill meter__fill--watch' : 'meter__fill';
  return (
    <div className="meter" role="img" aria-label={`${Math.round((value / target) * 100)}% of budget`}>
      <div className={cls} style={{ width: `${Math.min(100, (value / m) * 100)}%` }} />
      <div className="meter__target" style={{ left: `${(target / m) * 100}%` }} />
    </div>
  );
}
