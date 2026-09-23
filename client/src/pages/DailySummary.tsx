import { useState } from 'react';
import { Pencil } from 'lucide-react';
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
import { FormModal, num } from '@/components/forms/FormModal';
import { Waterfall } from '@/components/charts/Waterfall';
import { StackedBars } from '@/components/charts/StackedBars';
import { Legend } from '@/components/charts/core';
import { useActiveDate } from './daily/DailyShell';

export function DailySummary() {
  const m = useMetrics();
  const { setDate, setAccomplishment } = useProject();
  const [editing, setEditing] = useState(false);
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
          <Panel
            refNo="09-C"
            title="Accomplishment"
            sub="The day's physical output drives cost per unit"
            actions={
              <button className="btn btn--sm no-print" onClick={() => setEditing(true)}>
                <Pencil /> Update
              </button>
            }
          >
            <div className="stack">
              <dl className="dl">
                <dt>Actual excavation</dt>
                <dd>{qty(day.actual)} m³</dd>
                <dt>Planned</dt>
                <dd>{qty(day.planned)} m³</dd>
                <dt className="total">Achieved</dt>
                <dd className="total">{day.planned ? Math.round((day.actual / day.planned) * 100) : 0}%</dd>
              </dl>
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

      {editing && (
        <FormModal
          title="Update accomplishment"
          sub={`${fullDate(date)} · planned ${qty(day.planned)} m³`}
          fields={[{ name: 'actual', label: 'Actual excavation (m³)', kind: 'number', step: 1, full: true, hint: 'From the day’s survey' }]}
          initial={{ actual: String(day.actual) }}
          computed={(v) => {
            const q = num(v.actual);
            return <span className="num">{q > 0 ? `${php(day.total / q)} / m³` : '—'}</span>;
          }}
          computedLabel="Cost per m³ · day cost ÷ quantity"
          submitLabel="Save accomplishment"
          onSubmit={(v) => setAccomplishment(date, 'Excavation', { actual: Math.max(0, num(v.actual)) })}
          onClose={() => setEditing(false)}
        />
      )}
    </>
  );
}
