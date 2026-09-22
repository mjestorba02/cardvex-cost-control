import { useState } from 'react';
import { WEEK_DATES, dailyBudget } from '@/data/seed';
import { laborAllowance, laborCost, laborOvertime, laborRegular, variancePct } from '@/lib/calc';
import { dayLabel, php, qty } from '@/lib/format';
import { useProject } from '@/store/ProjectStore';
import { Panel } from '@/components/ui/Panel';
import { Readout, ReadoutCell } from '@/components/ui/Readout';
import { Delta } from '@/components/ui/Status';
import { Field } from '@/components/ui/Field';
import { DayStrip, DeleteButton, EntryForm, n, ok, useActiveDate } from './DailyShell';

export function LaborSheet() {
  const { records, add, remove } = useProject();
  const date = useActiveDate();
  const rows = records.labor.filter((e) => e.date === date);
  const totals = WEEK_DATES.map((d) => records.labor.filter((e) => e.date === d).reduce((s, e) => s + laborCost(e), 0));
  const dayTotal = rows.reduce((s, e) => s + laborCost(e), 0);
  const heads = rows.reduce((s, e) => s + e.headcount, 0);
  const ot = rows.reduce((s, e) => s + laborOvertime(e), 0);
  const allow = rows.reduce((s, e) => s + laborAllowance(e), 0);
  const acc = records.accomplishment.find((a) => a.date === date);
  const budget = dailyBudget.labor;

  const [f, setF] = useState({ position: '', heads: '', rate: '', days: '1', ot: '0', allow: '0' });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  const d = { heads: n(f.heads), rate: n(f.rate), days: n(f.days), ot: n(f.ot), allow: n(f.allow) };
  const valid = f.position.trim() !== '' && ok(d.heads, d.rate, d.days, d.ot, d.allow);
  const draft = { headcount: d.heads, dailyRate: d.rate, days: d.days, overtimeHrs: d.ot, allowance: d.allow };

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

      <EntryForm
        title={`Add manpower for ${dayLabel(date)}`}
        valid={valid}
        preview={<span className="num">{php(valid ? laborCost({ ...draft, id: '', date, position: '' }) : 0)}</span>}
        onSubmit={() => {
          add('labor', { date, position: f.position.trim(), ...draft });
          setF({ ...f, position: '', heads: '', rate: '' });
        }}
      >
        <Field label="Position" value={f.position} onChange={set('position')} placeholder="e.g. Operator" />
        <Field label="No. of workers" numeric value={f.heads} onChange={set('heads')} />
        <Field label="Daily rate ₱" numeric value={f.rate} onChange={set('rate')} />
        <Field label="Days" numeric value={f.days} onChange={set('days')} />
        <Field label="OT hrs / worker" numeric value={f.ot} onChange={set('ot')} />
        <Field label="Allowance ₱ / worker" numeric value={f.allow} onChange={set('allow')} />
      </EntryForm>

      <Panel refNo="06-A" title={`Manpower — ${dayLabel(date)}`} sub="Actual cost = workers × daily rate × days + overtime + allowances" flush>
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
                  <td className="r">
                    <DeleteButton onClick={() => remove('labor', e.id)} label={e.position} />
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
    </>
  );
}
