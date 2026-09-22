import { WEEK_DATES, dailyBudget } from '@/data/seed';
import { CATEGORY_LABEL, CATEGORY_SHORT, CATEGORY_VAR } from '@/data/labels';
import { DAILY_CATEGORIES } from '@/data/types';
import { variancePct } from '@/lib/calc';
import { dayLabel, dowLabel, fullDate, php, phpShort, qty } from '@/lib/format';
import { DAILY_BUDGET_TOTAL, useMetrics } from '@/lib/metrics';
import { useProject } from '@/store/ProjectStore';
import { Panel } from '@/components/ui/Panel';
import { Readout, ReadoutCell } from '@/components/ui/Readout';
import { Delta, VarianceTag } from '@/components/ui/Status';
import { Waterfall } from '@/components/charts/Waterfall';
import { StackedBars } from '@/components/charts/StackedBars';
import { Legend } from '@/components/charts/core';
import { useActiveDate } from './daily/DailyShell';

export function DailySummary() {
  const m = useMetrics();
  const { setDate, setAccomplishment } = useProject();
  const date = useActiveDate();
  const idx = WEEK_DATES.indexOf(date);
  const day = m.days[idx];
  const variance = day.total - day.budget;
  const cpu = day.actual ? day.total / day.actual : 0;
  const plannedCpu = day.planned ? day.budget / day.planned : 0;

  return (
    <>
      <Panel
        refNo="09-A"
        title="Daily actual cost — this week"
        sub="Stacked by category. Black tick = planned daily cost. Select a day to consolidate it."
        actions={
          <Legend items={DAILY_CATEGORIES.map((c) => ({ label: CATEGORY_LABEL[c], color: CATEGORY_VAR[c], kind: 'box' as const }))} />
        }
      >
        <StackedBars
          ariaLabel="Daily cost by category this week with planned daily cost"
          x={WEEK_DATES.map((d) => `${dowLabel(d)} ${dayLabel(d).split(' ')[1]}`)}
          xTooltip={WEEK_DATES.map(fullDate)}
          stacks={DAILY_CATEGORIES.map((c) => ({ id: c, label: CATEGORY_LABEL[c], color: CATEGORY_VAR[c] }))}
          values={m.days.map((d) => DAILY_CATEGORIES.map((c) => d.totals[c]))}
          targets={m.days.map((d) => d.budget)}
          targetLabel="Planned"
          yFormat={(v) => phpShort(v, 0)}
          tipFormat={php}
          selected={idx}
          onSelect={(i) => setDate(WEEK_DATES[i])}
          height={240}
        />
      </Panel>

      <Readout cols={4}>
        <ReadoutCell label={`Total daily actual cost · ${dayLabel(date)}`} value={php(day.total)} />
        <ReadoutCell label="Budgeted daily cost" value={php(DAILY_BUDGET_TOTAL)} meta="from cost baseline" />
        <ReadoutCell label="Daily variance" value={<Delta amount={variance} pct={variancePct(day.total, day.budget)} />} meta={<VarianceTag pct={variancePct(day.total, day.budget)} />} />
        <ReadoutCell label="Cost per m³" value={cpu ? php(cpu) : '—'} meta={`planned ${php(plannedCpu)} / m³`} />
      </Readout>

      <div className="grid grid--main-side">
        <Panel refNo="09-B" title={`Consolidation — ${fullDate(date)}`} sub="Equipment → Fuel → Labor → Materials → Maintenance = total daily actual cost">
          <Waterfall
            ariaLabel={`Build-up of daily cost for ${fullDate(date)}`}
            steps={DAILY_CATEGORIES.map((c) => ({ id: c, label: CATEGORY_SHORT[c], value: day.totals[c], color: CATEGORY_VAR[c] }))}
            totalLabel="Total"
            budget={day.budget}
            format={php}
            shortFormat={(v) => phpShort(v, 0)}
            height={280}
          />
        </Panel>

        <div className="stack">
          <Panel refNo="09-C" title="Accomplishment" sub="Record the day's physical output to get cost per unit">
            <div className="stack">
              <div className="field">
                <label htmlFor="acc-actual">Actual excavation, m³</label>
                <input
                  id="acc-actual"
                  className="input input--num"
                  type="number"
                  min={0}
                  value={day.actual}
                  onChange={(e) => setAccomplishment(date, 'Excavation', { actual: Math.max(0, Number(e.target.value) || 0) })}
                />
                <span className="hint">
                  Planned {qty(day.planned)} m³ · {day.planned ? Math.round((day.actual / day.planned) * 100) : 0}% achieved
                </span>
              </div>
              <div className="formula">
                <b>Cost/m³</b> = {php(day.total)} ÷ {qty(day.actual)} m³ = <b>{cpu ? php(cpu) : '—'}</b>
              </div>
            </div>
          </Panel>
          <Panel refNo="09-D" title="Formulas">
            <div className="stack small">
              <div className="formula">
                <b>Total daily cost</b> = Equip + Fuel + Labor + Materials + Maint + Other
              </div>
              <div className="formula">
                <b>Daily variance</b> = Actual − Budgeted = {php(day.total)} − {php(day.budget)}
              </div>
            </div>
          </Panel>
        </div>
      </div>

      <Panel refNo="09-E" title="Daily cost vs. planned — by category" flush>
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Cost category</th>
                <th className="r">Planned</th>
                <th className="r">Actual</th>
                <th className="r">Variance</th>
                <th>Status</th>
                <th className="r">Share of day</th>
              </tr>
            </thead>
            <tbody>
              {DAILY_CATEGORIES.map((c) => {
                const a = day.totals[c];
                const b = dailyBudget[c];
                return (
                  <tr key={c}>
                    <td>
                      <span className="swatch" style={{ background: CATEGORY_VAR[c] }} />
                      {CATEGORY_LABEL[c]}
                    </td>
                    <td className="r num">{php(b)}</td>
                    <td className="r num">{php(a)}</td>
                    <td className="r">
                      <Delta amount={a - b} pct={variancePct(a, b)} />
                    </td>
                    <td>
                      <VarianceTag pct={variancePct(a, b)} />
                    </td>
                    <td className="r num">{((a / (day.total || 1)) * 100).toFixed(1)}%</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td>Total daily actual cost</td>
                <td className="r num">{php(day.budget)}</td>
                <td className="r num">{php(day.total)}</td>
                <td className="r">
                  <Delta amount={variance} pct={variancePct(day.total, day.budget)} />
                </td>
                <td>
                  <VarianceTag pct={variancePct(day.total, day.budget)} />
                </td>
                <td className="r num">100%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Panel>
    </>
  );
}
