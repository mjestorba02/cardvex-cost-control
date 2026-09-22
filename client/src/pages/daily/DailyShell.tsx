import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Check, Plus, Trash2, X } from 'lucide-react';
import { WEEK_DATES, dailyBudget } from '@/data/seed';
import type { CostCategory } from '@/data/types';
import { severity, variancePct } from '@/lib/calc';
import { dayLabel, dowLabel, fullDate, phpShort } from '@/lib/format';
import { useProject } from '@/store/ProjectStore';

const SEV_COLOR = { over: 'var(--over-mark)', watch: 'var(--watch-mark)', ok: 'var(--rule-strong)', under: 'var(--good-mark)' };

/** The week as seven selectable cells, each showing that day's cost for one category. */
export function DayStrip({ category, totals }: { category: CostCategory; totals: number[] }) {
  const { activeDate, setDate } = useProject();
  const budget = dailyBudget[category];
  return (
    <div className="daystrip" role="group" aria-label="Select day">
      {WEEK_DATES.map((d, i) => {
        const s = severity(variancePct(totals[i], budget));
        return (
          <button key={d} aria-pressed={activeDate === d} onClick={() => setDate(d)} aria-label={`${fullDate(d)}: ${phpShort(totals[i])}`}>
            <span className="daystrip__d">
              {dowLabel(d)} <span className="muted">{dayLabel(d)}</span>
            </span>
            <span className="daystrip__v">{phpShort(totals[i])}</span>
            <span className="daystrip__bar" style={{ background: SEV_COLOR[s] }} aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}

export function useActiveDate() {
  const { activeDate } = useProject();
  return WEEK_DATES.includes(activeDate) ? activeDate : WEEK_DATES[WEEK_DATES.length - 1];
}

export function DeleteButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button className="btn btn--icon btn--sm btn--ghost no-print" onClick={onClick} aria-label={`Delete ${label}`} title="Delete entry">
      <Trash2 />
    </button>
  );
}

/** Collapsible "add entry" form with a live computed-cost preview. */
export function EntryForm({
  title,
  preview,
  onSubmit,
  children,
  valid,
}: {
  title: string;
  preview: ReactNode;
  onSubmit: () => void;
  children: ReactNode;
  valid: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => setSaved(false), 2200);
    return () => clearTimeout(t);
  }, [saved]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    onSubmit();
    setSaved(true);
  };

  if (!open)
    return (
      <div className="row no-print">
        <button className="btn btn--primary" onClick={() => setOpen(true)}>
          <Plus /> {title}
        </button>
        {saved && (
          <span className="tag tag--under">
            <Check /> Entry saved
          </span>
        )}
      </div>
    );

  return (
    <form className="panel no-print" onSubmit={submit} aria-label={title}>
      <div className="panel__head">
        <div className="panel__titles">
          <h2 className="panel__title">{title}</h2>
          <p className="panel__sub">Cost is computed as you type. All amounts in ₱.</p>
        </div>
        <button type="button" className="btn btn--icon btn--sm btn--ghost" onClick={() => setOpen(false)} aria-label="Close form">
          <X />
        </button>
      </div>
      <div className="panel__body stack">
        <div className="form-grid">{children}</div>
        <div className="row">
          <div className="form-preview">
            <span className="eyebrow">Computed</span>
            {preview}
          </div>
          <span className="spacer" />
          <button type="button" className="btn btn--ghost" onClick={() => setOpen(false)}>
            Cancel
          </button>
          <button type="submit" className="btn btn--accent" disabled={!valid} aria-disabled={!valid}>
            <Check /> Save entry
          </button>
        </div>
        {saved && (
          <span className="tag tag--under" role="status">
            <Check /> Entry saved — add another or close.
          </span>
        )}
      </div>
    </form>
  );
}

/** Parse a numeric input; empty or invalid → NaN so the form can block submit. */
export const n = (v: string) => (v.trim() === '' ? NaN : Number(v));
export const ok = (...vals: number[]) => vals.every((v) => Number.isFinite(v) && v >= 0);
