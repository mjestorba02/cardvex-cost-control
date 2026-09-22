import { Link } from 'react-router-dom';
import { ArrowRight, OctagonAlert, TrendingUp } from 'lucide-react';
import { months, plannedRemaining, TODAY, WEEK_DATES, CURRENT_WEEK } from '@/data/seed';
import { CATEGORY_LABEL, CATEGORY_VAR } from '@/data/labels';
import { DAILY_CATEGORIES } from '@/data/types';
import { cumulative, sumTotals, variancePct } from '@/lib/calc';
import { dayLabel, monthLabel, pct, pctSigned, php, phpShort } from '@/lib/format';
import { BUDGET_BY_CAT, TOTAL_BUDGET, useMetrics } from '@/lib/metrics';
import { useProject } from '@/store/ProjectStore';
import { Panel } from '@/components/ui/Panel';
import { Band, Readout, ReadoutCell } from '@/components/ui/Readout';
import { AlignmentTag, Delta, Meter, VarianceTag } from '@/components/ui/Status';
import { LineChart } from '@/components/charts/LineChart';
import { StackedBars } from '@/components/charts/StackedBars';
import { Legend } from '@/components/charts/core';

export function Dashboard() {
  const m = useMetrics();
  const { records } = useProject();

  // ---------- S-curve: cumulative cost ----------
  const cum = cumulative(m.monthsLive);
  const allMonths = [...months.map((x) => x.month), ...plannedRemaining.map((x) => x.month)];
  const planned = [...months.map((x) => x.plannedCost), ...plannedRemaining.map((x) => x.plannedCost)];
  const actual: (number | null)[] = allMonths.map((_, i) => cum[i]?.actualCost ?? null);
  const lastIdx = cum.length - 1;
  // Month labels mark month-end; the open month's actual sits at today's position.
  const todayFrac = lastIdx - 1 + Number(TODAY.slice(8)) / 30;
  const positions = allMonths.map((_, i) => (i === lastIdx ? todayFrac : i));
  const forecast: (number | null)[] = allMonths.map((_, i) => {
    if (i < lastIdx) return null;
    const t = (positions[i] - todayFrac) / (allMonths.length - 1 - todayFrac);
    return cum[lastIdx].actualCost! + (m.forecastFinal - cum[lastIdx].actualCost!) * t;
  });
  const earned: (number | null)[] = allMonths.map((_, i) => (i <= lastIdx ? (months[i].actualProgress / 100) * TOTAL_BUDGET : null));

  const todayCount =
    records.equipment.filter((e) => e.date === TODAY).length +
    records.fuel.filter((e) => e.date === TODAY).length +
    records.labor.filter((e) => e.date === TODAY).length +
    records.materials.filter((e) => e.date === TODAY).length +
    records.maintenance.filter((e) => e.date === TODAY).length;
  const todayTotal = m.days[m.days.length - 1];

  const overrun = m.forecastVariance < 0;

  return (
    <>
      <div className={`callout ${overrun ? 'callout--over' : 'callout--good'}`} role="status">
        {overrun ? <OctagonAlert aria-hidden="true" /> : <TrendingUp aria-hidden="true" />}
        <div className="row" style={{ gap: 12 }}>
          <span>
            Forecast final cost is <strong className="num">{phpShort(m.forecastFinal)}</strong> —{' '}
            <strong>
              {phpShort(Math.abs(m.forecastVariance))} {overrun ? 'over' : 'under'}
            </strong>{' '}
            the approved budget. Spend is {pct(m.costPctUsed)} of budget against {pct(m.actualProgress)} physical progress.
          </span>
          <Link to="/forecast" className="btn btn--sm">
            Review forecast <ArrowRight />
          </Link>
        </div>
      </div>

      <Band label="Cost" note={`to ${dayLabel(TODAY)}`}>
        <Readout cols={5}>
          <ReadoutCell label="Total budget" value={phpShort(TOTAL_BUDGET)} meta="approved" title={php(TOTAL_BUDGET)} />
          <ReadoutCell label="Actual cost to date" value={phpShort(m.costToDate)} title={php(m.costToDate)} meta={<>{pct(m.costPctUsed)} of budget used</>} />
          <ReadoutCell label="Remaining budget" value={phpShort(m.remainingBudget)} title={php(m.remainingBudget)} meta={`${pct(1 - m.costPctUsed)} left`} />
          <ReadoutCell
            label="Cost variance (EV − AC)"
            value={phpShort(m.costVariance)}
            title={php(m.costVariance)}
            meta={<VarianceTag pct={-m.costVariance / m.earned} />}
          />
          <ReadoutCell label="Cost % used" value={pct(m.costPctUsed)} meta={<AlignmentTag value={m.alignment} short />} />
        </Readout>
      </Band>

      <Band label="Progress" note="physical">
        <Readout cols={4}>
          <ReadoutCell label="Planned progress" value={pct(m.plannedProgress)} meta="per baseline schedule" />
          <ReadoutCell label="Actual progress" value={pct(m.actualProgress)} meta={`SPI ${m.spi.toFixed(2)}`} />
          <ReadoutCell
            label="Progress variance"
            value={pctSigned(m.progressVariance)}
            meta={<span className={m.progressVariance < 0 ? 'delta delta--over' : 'delta delta--under'}>{m.progressVariance < 0 ? 'Behind schedule' : 'Ahead of schedule'}</span>}
          />
          <ReadoutCell label="Remaining work" value={pct(1 - m.actualProgress)} meta={`${m.remainingMonths.toFixed(1)} months left`} />
        </Readout>
      </Band>

      <Band label="Forecast" note="at completion">
        <Readout cols={4}>
          <ReadoutCell label="Forecast final cost" value={phpShort(m.forecastFinal)} title={php(m.forecastFinal)} meta="actual + cost to complete" />
          <ReadoutCell
            label="Forecast variance"
            value={phpShort(m.forecastVariance)}
            title={php(m.forecastVariance)}
            meta={<VarianceTag pct={-m.forecastVariance / TOTAL_BUDGET} />}
          />
          <ReadoutCell label="Estimated remaining cost" value={phpShort(m.etcTotal)} title={php(m.etcTotal)} meta="estimate to complete" />
          <ReadoutCell label="Cost performance (CPI)" value={m.cpi.toFixed(2)} meta={m.cpi < 1 ? '₱1 buys ' + `₱${m.cpi.toFixed(2)} of work` : 'Under budget'} />
        </Readout>
      </Band>

      <div className="grid grid--main-side">
        <Panel
          refNo="S-CURVE"
          title="Cumulative cost — planned, actual, forecast"
          sub="Earned value is the budgeted cost of the work actually done. Actual above earned value means overspend."
          actions={
            <Link to="/cost-vs-accomplishment" className="btn btn--sm btn--ghost">
              Sheet 13 <ArrowRight />
            </Link>
          }
        >
          <div className="stack">
            <Legend
              items={[
                { label: 'Planned cost', color: 'var(--s-plan)' },
                { label: 'Actual cost', color: 'var(--s1)' },
                { label: 'Earned value', color: 'var(--s3)' },
                { label: 'Forecast', color: 'var(--s1)', kind: 'dash' },
              ]}
            />
            <LineChart
              ariaLabel="Cumulative planned cost, actual cost, earned value and forecast by month"
              x={allMonths.map((x) => monthLabel(x))}
              xTooltip={allMonths.map((x) => monthLabel(x, true))}
              height={300}
              yFormat={(v) => phpShort(v, 0)}
              tipFormat={(v) => phpShort(v, 2)}
              today={todayFrac}
              series={[
                { id: 'plan', label: 'Planned', color: 'var(--s-plan)', values: planned, endLabel: true },
                { id: 'ev', label: 'Earned', color: 'var(--s3)', values: earned, positions },
                { id: 'fc', label: 'Forecast', color: 'var(--s1)', values: forecast, dashed: true, endLabel: true, positions },
                { id: 'act', label: 'Actual', color: 'var(--s1)', values: actual, markers: true, area: true, positions },
              ]}
            />
          </div>
        </Panel>

        <Panel
          refNo={CURRENT_WEEK}
          title="This week by category"
          sub={`${dayLabel(WEEK_DATES[0])} – ${dayLabel(WEEK_DATES[6])} · bar = actual, tick = budget`}
          flush
          foot={
            <Link to="/weekly" className="row" style={{ textDecoration: 'none', gap: 6 }}>
              Open weekly cost monitoring <ArrowRight size={14} />
            </Link>
          }
        >
          <div className="table-wrap">
            <table className="tbl tbl--compact">
              <thead>
                <tr>
                  <th>Category</th>
                  <th style={{ width: '38%' }}>vs budget</th>
                  <th className="r">Actual</th>
                </tr>
              </thead>
              <tbody>
                {DAILY_CATEGORIES.map((c) => {
                  const v = variancePct(m.weekTotals[c], m.weekBudget[c]);
                  return (
                    <tr key={c}>
                      <td>
                        <span className="swatch" style={{ background: CATEGORY_VAR[c] }} />
                        {CATEGORY_LABEL[c]}
                        <span className="cell-sub">
                          <VarianceTag pct={v} />
                        </span>
                      </td>
                      <td>
                        <Meter value={m.weekTotals[c]} target={m.weekBudget[c]} />
                      </td>
                      <td className="r num">
                        {phpShort(m.weekTotals[c])}
                        <span className="cell-sub">of {phpShort(m.weekBudget[c])}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td>Total</td>
                  <td>
                    <Delta amount={m.weekActual - m.weekBudgetTotal} pct={variancePct(m.weekActual, m.weekBudgetTotal)} />
                  </td>
                  <td className="r num">{phpShort(m.weekActual)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Panel>
      </div>

      <Panel refNo="FLOW" title="Today's workflow" sub="Record → consolidate → compare → analyze → forecast. Each step opens its sheet." flush>
        <nav className="chain" style={{ ['--n' as string]: 5 }} aria-label="Workflow">
          <Link className="chain__step chain__step--active" to="/daily/equipment">
            <div className="chain__k">04–08 · daily records</div>
            <div className="chain__t">{todayCount} entries today</div>
            <div className="chain__v">5 of 5 records filed</div>
          </Link>
          <Link className="chain__step" to="/daily/summary">
            <div className="chain__k">09 · consolidation</div>
            <div className="chain__t">Daily actual cost</div>
            <div className="chain__v">
              {php(todayTotal.total)}{' '}
              <Delta amount={todayTotal.total - todayTotal.budget} pct={variancePct(todayTotal.total, todayTotal.budget)} format="pct" />
            </div>
          </Link>
          <Link className="chain__step" to="/weekly">
            <div className="chain__k">10 · weekly</div>
            <div className="chain__t">Week to date</div>
            <div className="chain__v">
              {phpShort(m.weekActual)} <Delta amount={m.weekActual - m.weekBudgetTotal} pct={variancePct(m.weekActual, m.weekBudgetTotal)} format="pct" />
            </div>
          </Link>
          <Link className="chain__step" to="/variance">
            <div className="chain__k">14 · variance analysis</div>
            <div className="chain__t">
              {DAILY_CATEGORIES.filter((c) => variancePct(m.weekTotals[c], m.weekBudget[c]) >= 0.05).length} categories flagged
            </div>
            <div className="chain__v">threshold ±5%</div>
          </Link>
          <Link className="chain__step" to="/forecast">
            <div className="chain__k">15 · forecast</div>
            <div className="chain__t">Final cost {phpShort(m.forecastFinal)}</div>
            <div className="chain__v">{phpShort(m.forecastVariance)} vs budget</div>
          </Link>
        </nav>
      </Panel>

      <div className="grid grid--2">
        <Panel refNo="TREND" title="Weekly spend vs budget" sub="Last 8 weeks · stack = actual cost, tick = weekly budget">
          <StackedBars
            ariaLabel="Weekly actual cost against weekly budget for the last eight weeks"
            x={m.weeks.map((w) => w.week)}
            xTooltip={m.weeks.map((w) => `${w.week} · from ${dayLabel(w.start)}`)}
            stacks={[{ id: 'a', label: 'Actual', color: 'var(--s1)' }]}
            values={m.weeks.map((w) => [w.actual])}
            targets={m.weeks.map((w) => w.budget)}
            yFormat={(v) => phpShort(v, 1)}
            tipFormat={(v) => php(v)}
            selected={m.weeks.length - 1}
            extraTip={(i) => [{ label: 'Excavated', value: `${m.weeks[i].done.toLocaleString()} / ${m.weeks[i].planned.toLocaleString()} m³` }]}
          />
        </Panel>

        <Panel refNo="MIX" title="Where the money went" sub="Cumulative actual vs category budget. Red % = used faster than physical progress." flush>
          <div className="table-wrap">
            <table className="tbl tbl--compact">
              <thead>
                <tr>
                  <th>Category</th>
                  <th className="r">Spent</th>
                  <th className="r">Budget</th>
                  <th className="r">% used</th>
                </tr>
              </thead>
              <tbody>
                {(Object.keys(m.actualByCat) as (keyof typeof m.actualByCat)[]).map((c) => {
                  const b = BUDGET_BY_CAT[c];
                  const used = m.actualByCat[c] / b;
                  return (
                    <tr key={c}>
                      <td>
                        <span className="swatch" style={{ background: CATEGORY_VAR[c] }} />
                        {CATEGORY_LABEL[c]}
                      </td>
                      <td className="r num">{phpShort(m.actualByCat[c])}</td>
                      <td className="r num muted">{phpShort(b, 0)}</td>
                      <td className="r">
                        <span className={`num ${used > m.actualProgress + 0.02 ? 'delta--over' : ''}`}>{pct(used)}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td>Total</td>
                  <td className="r num">{phpShort(sumTotals(m.actualByCat))}</td>
                  <td className="r num">{phpShort(TOTAL_BUDGET, 0)}</td>
                  <td className="r num">{pct(m.costPctUsed)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Panel>
      </div>
    </>
  );
}
