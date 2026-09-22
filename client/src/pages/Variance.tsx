import { useState } from 'react';
import { Check, CheckCircle2 } from 'lucide-react';
import { CAUSE_LIBRARY, CURRENT_WEEK } from '@/data/seed';
import { CATEGORY_LABEL, CATEGORY_VAR } from '@/data/labels';
import { DAILY_CATEGORIES, type CostCategory } from '@/data/types';
import { variancePct } from '@/lib/calc';
import { php } from '@/lib/format';
import { useMetrics } from '@/lib/metrics';
import { useProject } from '@/store/ProjectStore';
import { Panel } from '@/components/ui/Panel';
import { Delta, VarianceTag } from '@/components/ui/Status';

const THRESHOLD = 0.05;

function CauseCard({ category, actual, budget }: { category: CostCategory; actual: number; budget: number }) {
  const { notes, saveNote } = useProject();
  const saved = notes[category];
  const [causes, setCauses] = useState<string[]>(saved?.causes ?? []);
  const [action, setAction] = useState(saved?.action ?? '');
  const [owner, setOwner] = useState(saved?.owner ?? '');
  const [done, setDone] = useState(false);
  const v = variancePct(actual, budget);
  const dirty =
    JSON.stringify(causes) !== JSON.stringify(saved?.causes ?? []) || action !== (saved?.action ?? '') || owner !== (saved?.owner ?? '');

  const toggle = (c: string) => setCauses((xs) => (xs.includes(c) ? xs.filter((x) => x !== c) : [...xs, c]));

  return (
    <article className="cause-card" aria-labelledby={`cc-${category}`}>
      <div className="stack" style={{ gap: 8, alignContent: 'start' }}>
        <div className="row" style={{ gap: 8 }}>
          <span className="swatch" style={{ background: CATEGORY_VAR[category], margin: 0 }} />
          <h3 id={`cc-${category}`} style={{ fontSize: 'var(--fs-base)' }}>
            {CATEGORY_LABEL[category]}
          </h3>
        </div>
        <div className="cause-card__v">
          <Delta amount={actual - budget} pct={v} format="pct" />
        </div>
        <VarianceTag pct={v} showPct={false} />
        <div className="small muted">
          {php(actual)} actual
          <br />
          {php(budget)} budget
        </div>
      </div>

      <fieldset>
        <legend className="eyebrow">
          Possible causes
        </legend>
        {CAUSE_LIBRARY[category].map((c) => (
          <label key={c} className="check">
            <input type="checkbox" checked={causes.includes(c)} onChange={() => toggle(c)} />
            {c}
          </label>
        ))}
      </fieldset>

      <div className="stack" style={{ gap: 10, alignContent: 'start' }}>
        <div className="field">
          <label htmlFor={`act-${category}`}>Corrective action</label>
          <textarea
            id={`act-${category}`}
            className="textarea"
            value={action}
            onChange={(e) => setAction(e.target.value)}
            placeholder="What will be done, and by when?"
          />
        </div>
        <div className="field">
          <label htmlFor={`own-${category}`}>Responsible</label>
          <input id={`own-${category}`} className="input" value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="e.g. Equipment superintendent" />
        </div>
        <div className="row">
          <button
            className="btn btn--primary btn--sm"
            disabled={!dirty}
            onClick={() => {
              saveNote({ category, causes, action, owner });
              setDone(true);
              setTimeout(() => setDone(false), 2000);
            }}
          >
            <Check /> Save analysis
          </button>
          {done && (
            <span className="tag tag--under" role="status">
              <CheckCircle2 /> Saved
            </span>
          )}
          {!done && saved && !dirty && <span className="small muted">Saved · {saved.causes.length} causes</span>}
        </div>
      </div>
    </article>
  );
}

export function Variance() {
  const m = useMetrics();
  const rows = DAILY_CATEGORIES.map((c) => ({ c, a: m.weekTotals[c], b: m.weekBudget[c], v: variancePct(m.weekTotals[c], m.weekBudget[c]) }));
  const significant = rows.filter((r) => Math.abs(r.v) >= THRESHOLD).sort((x, y) => y.v - x.v);
  const within = rows.filter((r) => Math.abs(r.v) < THRESHOLD);

  return (
    <>
      <div className="callout">
        <span className="mono small">±5%</span>
        <span>
          Categories whose {CURRENT_WEEK} variance is 5% or more either way need a documented reason. Tick the likely causes, record the corrective action and who
          owns it. Saved analyses carry into the monthly report.
        </span>
      </div>

      <div className="stack">
        {significant.map((r) => (
          <CauseCard key={r.c} category={r.c} actual={r.a} budget={r.b} />
        ))}
      </div>

      <Panel refNo="14-B" title="Within threshold" sub="No explanation required this week" flush>
        <div className="table-wrap">
          <table className="tbl tbl--compact">
            <tbody>
              {within.map((r) => (
                <tr key={r.c}>
                  <td>
                    <span className="swatch" style={{ background: CATEGORY_VAR[r.c] }} />
                    {CATEGORY_LABEL[r.c]}
                  </td>
                  <td className="r num">{php(r.a)}</td>
                  <td className="r">
                    <Delta amount={r.a - r.b} pct={r.v} />
                  </td>
                  <td className="r">
                    <VarianceTag pct={r.v} />
                  </td>
                </tr>
              ))}
              {within.length === 0 && (
                <tr>
                  <td className="empty">Every category is outside the ±5% band this week.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
