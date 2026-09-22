import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { CURRENT_WEEK, WEEK_DATES } from '@/data/seed';
import { CATEGORY_LABEL, CATEGORY_VAR } from '@/data/labels';
import { DAILY_CATEGORIES } from '@/data/types';
import { alignment, severity, variancePct } from '@/lib/calc';
import { dayLabel, pct, php, phpShort, qty } from '@/lib/format';
import { useMetrics } from '@/lib/metrics';
import { Panel } from '@/components/ui/Panel';
import { Readout, ReadoutCell } from '@/components/ui/Readout';
import { AlignmentTag, Delta, Meter, VarianceTag } from '@/components/ui/Status';
import { LineChart } from '@/components/charts/LineChart';
import { Legend } from '@/components/charts/core';

export function Weekly() {
  const m = useMetrics();
  const q = m.weekQty;
  const progress = q.planned ? q.actual / q.planned : 0;
  const spend = m.weekActual / m.weekBudgetTotal;
  const cpuPlan = m.weekBudgetTotal / q.planned;
  const cpuAct = q.actual ? m.weekActual / q.actual : 0;
  const earned = cpuPlan * q.actual; // budgeted cost of the work actually done
  const flagged = DAILY_CATEGORIES.filter((c) => severity(variancePct(m.weekTotals[c], m.weekBudget[c])) !== 'ok' && variancePct(m.weekTotals[c], m.weekBudget[c]) > 0);

  return (
    <>
      <Readout cols={4}>
        <ReadoutCell label={`${CURRENT_WEEK} actual cost`} value={php(m.weekActual)} meta={`${dayLabel(WEEK_DATES[0])} – ${dayLabel(WEEK_DATES[6])}`} />
        <ReadoutCell label="Weekly budget" value={php(m.weekBudgetTotal)} meta="7 × planned daily cost" />
        <ReadoutCell label="Variance" value={<Delta amount={m.weekActual - m.weekBudgetTotal} pct={variancePct(m.weekActual, m.weekBudgetTotal)} />} meta={<VarianceTag pct={variancePct(m.weekActual, m.weekBudgetTotal)} />} />
        <ReadoutCell label="Spend vs. progress" value={`${pct(spend, 0)} / ${pct(progress, 0)}`} meta={<AlignmentTag value={alignment(spend, progress)} />} />
      </Readout>

      <Panel
        refNo="10-A"
        title="Weekly summary by cost category"
        sub="Variance = actual − budget. Positive means overrun."
        flush
        actions={
          flagged.length > 0 && (
            <Link to="/variance" className="btn btn--sm">
              Explain {flagged.length} variances <ArrowRight />
            </Link>
          )
        }
      >
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Cost category</th>
                <th className="r">Weekly budget</th>
                <th className="r">Actual cost</th>
                <th className="r">Variance</th>
                <th className="r">Variance %</th>
                <th style={{ minWidth: 140 }}>Actual vs budget</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {DAILY_CATEGORIES.map((c) => {
                const a = m.weekTotals[c];
                const b = m.weekBudget[c];
                const v = variancePct(a, b);
                return (
                  <tr key={c}>
                    <td>
                      <span className="swatch" style={{ background: CATEGORY_VAR[c] }} />
                      {CATEGORY_LABEL[c]}
                    </td>
                    <td className="r num">{php(b)}</td>
                    <td className="r num">{php(a)}</td>
                    <td className="r">
                      <Delta amount={a - b} pct={v} />
                    </td>
                    <td className="r">
                      <Delta amount={a - b} pct={v} format="pct" />
                    </td>
                    <td>
                      <Meter value={a} target={b} />
                    </td>
                    <td>
                      <VarianceTag pct={v} showPct={false} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td>Total</td>
                <td className="r num">{php(m.weekBudgetTotal)}</td>
                <td className="r num">{php(m.weekActual)}</td>
                <td className="r">
                  <Delta amount={m.weekActual - m.weekBudgetTotal} pct={variancePct(m.weekActual, m.weekBudgetTotal)} />
                </td>
                <td className="r">
                  <Delta amount={m.weekActual - m.weekBudgetTotal} pct={variancePct(m.weekActual, m.weekBudgetTotal)} format="pct" />
                </td>
                <td>
                  <Meter value={m.weekActual} target={m.weekBudgetTotal} />
                </td>
                <td>
                  <VarianceTag pct={variancePct(m.weekActual, m.weekBudgetTotal)} showPct={false} />
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Panel>

      <div className="grid grid--2">
        <Panel refNo="10-B" title="Weekly accomplishment — Earthworks" sub="Is the project spending faster or slower than it is accomplishing work?">
          <div className="stack">
            <dl className="dl">
              <dt>Planned weekly accomplishment</dt>
              <dd>{qty(q.planned)} m³</dd>
              <dt>Actual weekly accomplishment</dt>
              <dd>{qty(q.actual)} m³</dd>
              <dt>% accomplishment</dt>
              <dd>{pct(progress)}</dd>
              <dt>Planned cost</dt>
              <dd>{php(m.weekBudgetTotal)}</dd>
              <dt>Actual cost</dt>
              <dd>{php(m.weekActual)}</dd>
              <dt>Cost per unit — planned / actual</dt>
              <dd>
                {php(cpuPlan)} / <span className={cpuAct > cpuPlan ? 'delta--over' : 'delta--under'}>{php(cpuAct)}</span> per m³
              </dd>
              <dt className="total">Cost variance (earned − actual)</dt>
              <dd className="total">
                <Delta amount={m.weekActual - earned} pct={variancePct(m.weekActual, earned)} />
              </dd>
            </dl>
            <div className={`callout ${spend > progress ? 'callout--over' : 'callout--good'}`}>
              <span className="mono small">{pct(spend, 0)}</span>
              <span>
                of the weekly budget was spent to deliver <strong>{pct(progress, 0)}</strong> of planned output. The {qty(q.actual)} m³ done was
                worth {php(earned)} at planned rates but cost {php(m.weekActual)}.
              </span>
            </div>
          </div>
        </Panel>

        <Panel refNo="10-C" title="Cost per m³ — 8-week trend" sub="Weekly actual cost ÷ weekly excavated quantity">
          <div className="stack">
            <Legend
              items={[
                { label: 'Actual cost/m³', color: 'var(--s1)' },
                { label: 'Planned cost/m³', color: 'var(--s-plan)' },
              ]}
            />
            <LineChart
              ariaLabel="Weekly actual cost per cubic meter against planned, last eight weeks"
              x={m.weeks.map((w) => w.week)}
              xTooltip={m.weeks.map((w) => `${w.week} · from ${dayLabel(w.start)}`)}
              height={240}
              yFormat={(v) => php(v)}
              series={[
                { id: 'plan', label: 'Planned', color: 'var(--s-plan)', values: m.weeks.map((w) => w.budget / w.planned) },
                { id: 'act', label: 'Actual', color: 'var(--s1)', values: m.weeks.map((w) => w.actual / w.done), markers: true, endLabel: true },
              ]}
            />
          </div>
        </Panel>
      </div>

      <Panel refNo="10-D" title="Seven daily records consolidated" sub="Each row is one day's total from sheet 09" flush>
        <div className="table-wrap">
          <table className="tbl tbl--compact">
            <thead>
              <tr>
                <th>Date</th>
                {DAILY_CATEGORIES.map((c) => (
                  <th key={c} className="r">
                    {CATEGORY_LABEL[c]}
                  </th>
                ))}
                <th className="r">Total</th>
                <th className="r">Excavated</th>
                <th className="r">Cost/m³</th>
              </tr>
            </thead>
            <tbody>
              {m.days.map((d) => (
                <tr key={d.date}>
                  <td className="num">{dayLabel(d.date)}</td>
                  {DAILY_CATEGORIES.map((c) => (
                    <td key={c} className="r num">
                      {phpShort(d.totals[c])}
                    </td>
                  ))}
                  <td className="r num">{php(d.total)}</td>
                  <td className="r num">{qty(d.actual)} m³</td>
                  <td className="r num">{d.actual ? php(d.total / d.actual) : '—'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td>Week</td>
                {DAILY_CATEGORIES.map((c) => (
                  <td key={c} className="r num">
                    {phpShort(m.weekTotals[c])}
                  </td>
                ))}
                <td className="r num">{php(m.weekActual)}</td>
                <td className="r num">{qty(q.actual)} m³</td>
                <td className="r num">{php(cpuAct)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Panel>
    </>
  );
}
