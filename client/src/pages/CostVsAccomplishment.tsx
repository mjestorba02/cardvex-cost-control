import { TODAY } from '@/data/seed';
import { alignment, cumulative } from '@/lib/calc';
import { dayLabel, monthLabel, pct, phpShort } from '@/lib/format';
import { TOTAL_BUDGET, useMetrics } from '@/lib/metrics';
import { Panel } from '@/components/ui/Panel';
import { Readout, ReadoutCell } from '@/components/ui/Readout';
import { AlignmentTag } from '@/components/ui/Status';
import { LineChart } from '@/components/charts/LineChart';
import { Legend } from '@/components/charts/core';

export function CostVsAccomplishment() {
  const m = useMetrics();
  const cum = cumulative(m.monthsLive);
  const labels = cum.map((c, i) => monthLabel(c.month) + (i === cum.length - 1 ? '*' : ''));
  const costPct = cum.map((c) => (c.actualCost ?? 0) / TOTAL_BUDGET);
  const gap = m.costPctUsed - m.actualProgress;

  return (
    <>
      <Readout cols={4}>
        <ReadoutCell label="Budget spent" value={pct(m.costPctUsed)} meta={`${phpShort(m.costToDate)} of ${phpShort(TOTAL_BUDGET, 0)}`} hero />
        <ReadoutCell label="Work accomplished" value={pct(m.actualProgress)} meta={`planned ${pct(m.plannedProgress)} by ${dayLabel(TODAY)}`} hero />
        <ReadoutCell label="Gap (spend − progress)" value={`${gap >= 0 ? '+' : '−'}${Math.abs(gap * 100).toFixed(1)} pts`} meta={<AlignmentTag value={m.alignment} short />} />
        <ReadoutCell label="Cost performance (CPI)" value={m.cpi.toFixed(2)} meta={`every ₱1.00 spent earned ₱${m.cpi.toFixed(2)} of work`} />
      </Readout>

      <Panel
        refNo="13-A"
        title="Spending vs. progress — both as % of the whole"
        sub="Indexing cost to % of budget puts money and physical progress on one scale. When the blue line runs above green, the project is spending faster than it builds."
      >
        <div className="stack">
          <Legend
            items={[
              { label: 'Cost spent (% of budget)', color: 'var(--s1)' },
              { label: 'Actual progress', color: 'var(--s3)' },
              { label: 'Planned progress', color: 'var(--s-plan)', kind: 'dash' },
            ]}
          />
          <LineChart
            ariaLabel="Cumulative percent of budget spent versus actual and planned physical progress, by month"
            x={labels}
            xTooltip={cum.map((c, i) => monthLabel(c.month, true) + (i === cum.length - 1 ? ` · to ${dayLabel(TODAY)}` : ''))}
            height={300}
            yFormat={(v) => `${Math.round(v * 100)}%`}
            tipFormat={(v) => pct(v)}
            yMin={0}
            series={[
              { id: 'plan', label: 'Planned', color: 'var(--s-plan)', values: cum.map((c) => c.plannedProgress / 100), dashed: true },
              { id: 'prog', label: 'Progress', color: 'var(--s3)', values: cum.map((c) => (c.actualProgress ?? 0) / 100), markers: true, endLabel: true },
              { id: 'cost', label: 'Cost', color: 'var(--s1)', values: costPct, markers: true, endLabel: true },
            ]}
          />
        </div>
      </Panel>

      <Panel refNo="13-B" title="Monthly cost vs. accomplishment" sub="Cumulative values at each month-end" flush>
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Month</th>
                <th className="r">Planned progress</th>
                <th className="r">Actual progress</th>
                <th className="r">Planned cost</th>
                <th className="r">Actual cost</th>
                <th className="r">Cost % of budget</th>
                <th>Position</th>
              </tr>
            </thead>
            <tbody>
              {cum.map((c, i) => {
                const cp = (c.actualCost ?? 0) / TOTAL_BUDGET;
                const ap = (c.actualProgress ?? 0) / 100;
                return (
                  <tr key={c.month}>
                    <td>
                      {monthLabel(c.month, true)}
                      {i === cum.length - 1 && <span className="cell-sub">to {dayLabel(TODAY)}</span>}
                    </td>
                    <td className="r num">{c.plannedProgress}%</td>
                    <td className="r num">{c.actualProgress}%</td>
                    <td className="r num">{phpShort(c.plannedCost, 1)}</td>
                    <td className="r num">{phpShort(c.actualCost ?? 0, 1)}</td>
                    <td className="r num">{pct(cp)}</td>
                    <td>
                      <AlignmentTag value={alignment(cp, ap)} short />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="panel__foot">
          <b>Faster</b> → potential cost issue · <b>Slower</b> → potentially favorable cost position · <b>Aligned</b> → tracking to plan (±1 pt)
        </div>
      </Panel>
    </>
  );
}
