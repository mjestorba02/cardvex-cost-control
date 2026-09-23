import { WEEK_DATES, dailyBudget } from '@/data/seed';
import type { LaborEntry } from '@/data/types';
import { laborAllowance, laborCost, laborOvertime, laborRegular, variancePct } from '@/lib/calc';
import { dayLabel, php, qty } from '@/lib/format';
import { useProject } from '@/store/ProjectStore';
import { Panel } from '@/components/ui/Panel';
import { Readout, ReadoutCell } from '@/components/ui/Readout';
import { Delta } from '@/components/ui/Status';
import { num } from '@/components/forms/FormModal';
import { useRecordCrud, type CrudSpec } from '@/components/forms/useRecordCrud';
import { DayStrip, useActiveDate } from './DailyShell';

const SPEC: CrudSpec<LaborEntry> = {
  kind: 'labor',
  noun: 'manpower line',
  fields: [
    { name: 'position', label: 'Position', placeholder: 'e.g. Equipment operator', full: true },
    { name: 'heads', label: 'No. of workers', kind: 'number', step: 1, min: 1 },
    { name: 'rate', label: 'Daily rate ₱', kind: 'number', step: 50 },
    { name: 'days', label: 'Days', kind: 'number', step: 0.5 },
    { name: 'ot', label: 'OT hrs per worker', kind: 'number', step: 0.5, hint: 'Paid at 125% hourly' },
    { name: 'allow', label: 'Allowance ₱ per worker', kind: 'number', step: 50, hint: 'Meal / transport' },
  ],
  defaults: { days: '1', ot: '0', allow: '0' },
  toValues: (r) => ({
    position: r.position,
    heads: String(r.headcount),
    rate: String(r.dailyRate),
    days: String(r.days),
    ot: String(r.overtimeHrs),
    allow: String(r.allowance),
  }),
  fromValues: (v) => ({
    position: v.position.trim(),
    headcount: num(v.heads),
    dailyRate: num(v.rate),
    days: num(v.days),
    overtimeHrs: num(v.ot),
    allowance: num(v.allow),
  }),
  computed: (v) => {
    const total = laborCost({
      id: '',
      date: '',
      position: '',
      headcount: num(v.heads),
      dailyRate: num(v.rate),
      days: num(v.days),
      overtimeHrs: num(v.ot),
      allowance: num(v.allow),
    });
    return <span className="num">{Number.isFinite(total) ? php(total) : '—'}</span>;
  },
  computedLabel: 'Actual cost · regular + OT + allowance',
  describe: (r) => `${r.headcount} × ${r.position}`,
};

export function LaborSheet() {
  const { records } = useProject();
  const date = useActiveDate();
  const rows = records.labor.filter((e) => e.date === date);
  const totals = WEEK_DATES.map((d) => records.labor.filter((e) => e.date === d).reduce((s, e) => s + laborCost(e), 0));
  const dayTotal = rows.reduce((s, e) => s + laborCost(e), 0);
  const heads = rows.reduce((s, e) => s + e.headcount, 0);
  const ot = rows.reduce((s, e) => s + laborOvertime(e), 0);
  const allow = rows.reduce((s, e) => s + laborAllowance(e), 0);
  const acc = records.accomplishment.find((a) => a.date === date);
  const budget = dailyBudget.labor;

  const { AddButton, RowActions, modals } = useRecordCrud(SPEC, date);

  return (
    <>
      <DayStrip category="labor" totals={totals} />

      <Readout cols={5}>
        <ReadoutCell label={`Labor cost · ${dayLabel(date)}`} value={php(dayTotal)} meta={<Delta amount={dayTotal - budget} pct={variancePct(dayTotal, budget)} />} />
        <ReadoutCell label="Manpower on site" value={heads} meta={`${rows.length} positions`} />
        <ReadoutCell label="Overtime" value={php(ot)} meta="paid at 125% hourly" />
        <ReadoutCell label="Allowances" value={php(allow)} meta="meal / transport" />
        <ReadoutCell label="Labor cost / m³" value={acc?.actual ? php(dayTotal / acc.actual) : '—'} meta={acc ? `${qty(acc.actual)} m³ excavated` : ''} />
      </Readout>

      <Panel
        refNo="06-A"
        title={`Manpower — ${dayLabel(date)}`}
        sub="Actual cost = workers × daily rate × days + overtime + allowances"
        flush
        actions={<AddButton label="Add manpower" />}
      >
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Position</th>
                <th className="r">No.</th>
                <th className="r">Daily rate</th>
                <th className="r">Days</th>
                <th className="r">Regular</th>
                <th className="r">Overtime</th>
                <th className="r">Allowance</th>
                <th className="r">Actual cost</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => (
                <tr key={e.id}>
                  <td>{e.position}</td>
                  <td className="r num">{e.headcount}</td>
                  <td className="r num">{php(e.dailyRate)}</td>
                  <td className="r num">{e.days}</td>
                  <td className="r num">{php(laborRegular(e))}</td>
                  <td className="r num">{laborOvertime(e) ? php(laborOvertime(e)) : <span className="muted">—</span>}</td>
                  <td className="r num">{laborAllowance(e) ? php(laborAllowance(e)) : <span className="muted">—</span>}</td>
                  <td className="r num">{php(laborCost(e))}</td>
                  <td>
                    <RowActions row={e} />
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={9} className="empty">
                    No attendance recorded.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr>
                <td>Total</td>
                <td className="r num">{heads}</td>
                <td />
                <td />
                <td className="r num">{php(rows.reduce((s, e) => s + laborRegular(e), 0))}</td>
                <td className="r num">{php(ot)}</td>
                <td className="r num">{php(allow)}</td>
                <td className="r num">{php(dayTotal)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </Panel>

      {modals}
    </>
  );
}
