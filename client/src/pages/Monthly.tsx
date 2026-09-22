import { contract, TODAY } from '@/data/seed';
import { CATEGORY_LABEL, CATEGORY_VAR } from '@/data/labels';
import { CATEGORIES } from '@/data/types';
import { monthTotal, sumTotals } from '@/lib/calc';
import { dayLabel, monthLabel, pct, php, phpShort } from '@/lib/format';
import { BUDGET_BY_CAT, REVISED_CONTRACT, TOTAL_BUDGET, useMetrics } from '@/lib/metrics';
import { useProject } from '@/store/ProjectStore';
import { Panel } from '@/components/ui/Panel';
import { StackedBars } from '@/components/charts/StackedBars';
import { Legend } from '@/components/charts/core';
import { Meter } from '@/components/ui/Status';

export function Monthly() {
  const m = useMetrics();
  const { notes } = useProject();
  const current = m.monthsLive[m.monthsLive.length - 1];
  const previous = m.monthsLive.slice(0, -1);
  const prevByCat = (c: (typeof CATEGORIES)[number]) => previous.reduce((s, x) => s + x.actualByCategory[c], 0);
  const vo = contract.variationOrders.reduce((s, v) => s + v.amount, 0);
  const noteList = Object.values(notes).filter((n) => n && (n.causes.length || n.action));

  return (
    <>
      <div className="grid grid--side-main">
        <Panel refNo="11-A" title="Contract status" sub={`as of ${dayLabel(TODAY)}`}>
          <dl className="dl">
            <dt>Original contract</dt>
            <dd>{php(contract.originalAmount)}</dd>
            <dt>Approved variation orders ({contract.variationOrders.length})</dt>
            <dd>+{php(vo)}</dd>
            <dt className="total">Revised contract</dt>
            <dd className="total">{php(REVISED_CONTRACT)}</dd>
            <dt>Project duration</dt>
            <dd>{contract.durationMonths} months</dd>
            <dt>Elapsed duration</dt>
            <dd>{m.elapsedMonths.toFixed(1)} months</dd>
            <dt>Remaining duration</dt>
            <dd>{m.remainingMonths.toFixed(1)} months</dd>
          </dl>
          <div style={{ marginTop: 12 }}>
            <Meter value={m.elapsedMonths} target={contract.durationMonths} max={contract.durationMonths} />
            <div className="row small muted" style={{ marginTop: 6, justifyContent: 'space-between' }}>
              <span>{pct(m.elapsedMonths / contract.durationMonths, 0)} of time elapsed</span>
              <span>{pct(m.actualProgress, 0)} of work done</span>
            </div>
          </div>
        </Panel>

        <Panel
          refNo="11-B"
          title="Monthly actual cost"
          sub="Stacked by category · tick = planned monthly cost"
          actions={<Legend items={CATEGORIES.map((c) => ({ label: CATEGORY_LABEL[c], color: CATEGORY_VAR[c], kind: 'box' as const }))} />}
        >
          <StackedBars
            ariaLabel="Monthly actual cost by category with planned monthly cost"
            x={m.monthsLive.map((x) => monthLabel(x.month) + (x.closed ? '' : '*'))}
            xTooltip={m.monthsLive.map((x) => monthLabel(x.month, true) + (x.closed ? '' : ` · to ${dayLabel(TODAY)}`))}
            stacks={CATEGORIES.map((c) => ({ id: c, label: CATEGORY_LABEL[c], color: CATEGORY_VAR[c] }))}
            values={m.monthsLive.map((x) => CATEGORIES.map((c) => x.actualByCategory[c]))}
            targets={m.monthsLive.map((x, i) => x.plannedCost - (i ? m.monthsLive[i - 1].plannedCost : 0))}
            targetLabel="Planned"
            yFormat={(v) => phpShort(v, 0)}
            tipFormat={(v) => phpShort(v, 2)}
            selected={m.monthsLive.length - 1}
            height={260}
          />
          <p className="small muted" style={{ marginTop: 6 }}>
            * {monthLabel(current.month, true)} is open — month to date.
          </p>
        </Panel>
      </div>

      <Panel refNo="11-C" title="Monthly cost summary" sub={`${monthLabel(current.month, true)} report · Remaining budget = budget − cumulative actual`} flush>
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Cost category</th>
                <th className="r">Budget</th>
                <th className="r">Previous actual</th>
                <th className="r">Current month</th>
                <th className="r">Cumulative actual</th>
                <th className="r">Remaining budget</th>
                <th style={{ minWidth: 130 }}>% used</th>
              </tr>
            </thead>
            <tbody>
              {CATEGORIES.map((c) => {
                const cum = m.actualByCat[c];
                const used = cum / BUDGET_BY_CAT[c];
                return (
                  <tr key={c}>
                    <td>
                      <span className="swatch" style={{ background: CATEGORY_VAR[c] }} />
                      {CATEGORY_LABEL[c]}
                    </td>
                    <td className="r num">{php(BUDGET_BY_CAT[c])}</td>
                    <td className="r num">{php(prevByCat(c))}</td>
                    <td className="r num">{php(current.actualByCategory[c])}</td>
                    <td className="r num">{php(cum)}</td>
                    <td className="r num">{php(BUDGET_BY_CAT[c] - cum)}</td>
                    <td>
                      <div className="row" style={{ gap: 8, flexWrap: 'nowrap' }}>
                        <div style={{ flex: 1 }}>
                          <Meter value={cum} target={BUDGET_BY_CAT[c] * m.actualProgress} max={BUDGET_BY_CAT[c]} />
                        </div>
                        <span className="num small">{pct(used, 0)}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td>Total</td>
                <td className="r num">{php(TOTAL_BUDGET)}</td>
                <td className="r num">{php(previous.reduce((s, x) => s + monthTotal(x), 0))}</td>
                <td className="r num">{php(monthTotal(current))}</td>
                <td className="r num">{php(sumTotals(m.actualByCat))}</td>
                <td className="r num">{php(m.remainingBudget)}</td>
                <td className="num small">{pct(m.costPctUsed, 0)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <div className="panel__foot">Meter tick marks what each category should have used at {pct(m.actualProgress, 0)} physical progress.</div>
      </Panel>

      <Panel refNo="11-D" title="Variance explanations carried from sheet 14" sub="Documented causes and corrective actions">
        {noteList.length === 0 ? (
          <p className="muted small">No variance analyses saved yet. Record them on sheet 14 — Variance Analysis.</p>
        ) : (
          <div className="table-wrap">
            <table className="tbl tbl--compact">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Causes</th>
                  <th>Corrective action</th>
                  <th>Responsible</th>
                </tr>
              </thead>
              <tbody>
                {noteList.map((n) => (
                  <tr key={n!.category}>
                    <td>{CATEGORY_LABEL[n!.category]}</td>
                    <td>{n!.causes.join('; ') || '—'}</td>
                    <td>{n!.action || '—'}</td>
                    <td>{n!.owner || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}
