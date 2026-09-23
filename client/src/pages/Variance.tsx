import { useState } from 'react';
import { Check, ClipboardList, Pencil } from 'lucide-react';
import { CAUSE_LIBRARY, CURRENT_WEEK } from '@/data/seed';
import { CATEGORY_LABEL, CATEGORY_VAR } from '@/data/labels';
import { DAILY_CATEGORIES, type CostCategory } from '@/data/types';
import { variancePct } from '@/lib/calc';
import { php } from '@/lib/format';
import { useMetrics } from '@/lib/metrics';
import { useProject } from '@/store/ProjectStore';
import { Panel } from '@/components/ui/Panel';
import { Modal } from '@/components/ui/Modal';
import { Delta, VarianceTag } from '@/components/ui/Status';

const THRESHOLD = 0.05;

/** The analysis dialog: tick causes, write the corrective action, name an owner. */
function AnalysisModal({ category, actual, budget, onClose }: { category: CostCategory; actual: number; budget: number; onClose: () => void }) {
  const { notes, saveNote } = useProject();
  const saved = notes[category];
  const [causes, setCauses] = useState<string[]>(saved?.causes ?? []);
  const [action, setAction] = useState(saved?.action ?? '');
  const [owner, setOwner] = useState(saved?.owner ?? '');
  const v = variancePct(actual, budget);
  const toggle = (c: string) => setCauses((xs) => (xs.includes(c) ? xs.filter((x) => x !== c) : [...xs, c]));

  return (
    <Modal
      title={`${CATEGORY_LABEL[category]} — variance analysis`}
      sub={`${CURRENT_WEEK} · ${php(actual)} actual against ${php(budget)} budget`}
      onClose={onClose}
      footer={
        <>
          <span className="small muted">{causes.length} cause{causes.length === 1 ? '' : 's'} selected</span>
          <span className="spacer" />
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn--accent"
            onClick={() => {
              saveNote({ category, causes, action, owner });
              onClose();
            }}
          >
            <Check /> Save analysis
          </button>
        </>
      }
    >
      <div className="modal__body">
        <div className={`callout ${v > 0 ? 'callout--over' : 'callout--good'}`}>
          <span className="cause-card__v">
            <Delta amount={actual - budget} pct={v} format="pct" />
          </span>
          <span>
            {v > 0 ? 'Overrun' : 'Saving'} of <strong>{php(Math.abs(actual - budget))}</strong> against the weekly budget. Record why it happened and what
            will be done — this carries into the monthly report.
          </span>
        </div>

        <fieldset className="cause-fields">
          <legend className="eyebrow">Possible causes</legend>
          <div className="cause-grid">
            {CAUSE_LIBRARY[category].map((c) => (
              <label key={c} className="check">
                <input type="checkbox" checked={causes.includes(c)} onChange={() => toggle(c)} />
                {c}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="field">
          <label htmlFor="va-action">Corrective action</label>
          <textarea id="va-action" className="textarea" value={action} onChange={(e) => setAction(e.target.value)} placeholder="What will be done, and by when?" />
        </div>
        <div className="field">
          <label htmlFor="va-owner">Responsible</label>
          <input id="va-owner" className="input" value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="e.g. Equipment superintendent" />
        </div>
      </div>
    </Modal>
  );
}

export function Variance() {
  const m = useMetrics();
  const { notes } = useProject();
  const [open, setOpen] = useState<CostCategory | null>(null);
  const rows = DAILY_CATEGORIES.map((c) => ({ c, a: m.weekTotals[c], b: m.weekBudget[c], v: variancePct(m.weekTotals[c], m.weekBudget[c]) }));
  const significant = rows.filter((r) => Math.abs(r.v) >= THRESHOLD).sort((x, y) => y.v - x.v);
  const within = rows.filter((r) => Math.abs(r.v) < THRESHOLD);
  const explained = significant.filter((r) => notes[r.c]?.causes.length).length;

  return (
    <>
      <div className="callout">
        <span className="mono small">±5%</span>
        <span>
          Categories whose {CURRENT_WEEK} variance is 5% or more either way need a documented reason — {explained} of {significant.length} done. Open a category
          to tick the likely causes and record the corrective action.
        </span>
      </div>

      <Panel refNo="14-A" title="Significant variances" sub="Sorted by size of overrun. Analysis is recorded per category." flush>
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Cost category</th>
                <th className="r">Weekly budget</th>
                <th className="r">Actual</th>
                <th className="r">Variance</th>
                <th>Status</th>
                <th>Documented causes</th>
                <th>Corrective action</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {significant.map((r) => {
                const note = notes[r.c];
                return (
                  <tr key={r.c}>
                    <td>
                      <span className="swatch" style={{ background: CATEGORY_VAR[r.c] }} />
                      {CATEGORY_LABEL[r.c]}
                    </td>
                    <td className="r num">{php(r.b)}</td>
                    <td className="r num">{php(r.a)}</td>
                    <td className="r">
                      <Delta amount={r.a - r.b} pct={r.v} />
                    </td>
                    <td>
                      <VarianceTag pct={r.v} />
                    </td>
                    <td className={note?.causes.length ? undefined : 'muted'}>
                      {note?.causes.length ? note.causes.join('; ') : 'Not yet analysed'}
                    </td>
                    <td className={note?.action ? undefined : 'muted'}>
                      {note?.action || '—'}
                      {note?.owner && <span className="cell-sub">{note.owner}</span>}
                    </td>
                    <td>
                      <div className="row-actions no-print">
                        <button
                          className={note?.causes.length ? 'btn btn--sm' : 'btn btn--sm btn--accent'}
                          onClick={() => setOpen(r.c)}
                          aria-label={`${note?.causes.length ? 'Edit' : 'Record'} analysis for ${CATEGORY_LABEL[r.c]}`}
                        >
                          {note?.causes.length ? <Pencil /> : <ClipboardList />}
                          {note?.causes.length ? 'Edit' : 'Analyse'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {significant.length === 0 && (
                <tr>
                  <td colSpan={8} className="empty">
                    Every category is inside the ±5% band this week.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>

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

      {open && <AnalysisModal category={open} actual={m.weekTotals[open]} budget={m.weekBudget[open]} onClose={() => setOpen(null)} />}
    </>
  );
}
