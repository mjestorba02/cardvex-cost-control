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
