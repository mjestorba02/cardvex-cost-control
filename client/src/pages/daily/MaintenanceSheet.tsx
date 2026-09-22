import { useState } from 'react';
import { WEEK_DATES, dailyBudget } from '@/data/seed';
import type { MaintenanceKind } from '@/data/types';
import { maintenanceCost, variancePct } from '@/lib/calc';
import { dayLabel, php } from '@/lib/format';
import { useProject } from '@/store/ProjectStore';
import { Panel } from '@/components/ui/Panel';
import { Readout, ReadoutCell } from '@/components/ui/Readout';
import { Delta } from '@/components/ui/Status';
import { Field, SelectField } from '@/components/ui/Field';
import { DayStrip, DeleteButton, EntryForm, n, ok, useActiveDate } from './DailyShell';

const KINDS: MaintenanceKind[] = ['Preventive', 'Corrective', 'Tires', 'Lubricants', 'Spare parts'];

export function MaintenanceSheet() {
  const { records, add, remove } = useProject();
  const date = useActiveDate();
  const rows = records.maintenance.filter((e) => e.date === date);
  const week = records.maintenance;
  const totals = WEEK_DATES.map((d) => week.filter((e) => e.date === d).reduce((s, e) => s + maintenanceCost(e), 0));
  const dayTotal = rows.reduce((s, e) => s + maintenanceCost(e), 0);
  const weekTotal = totals.reduce((a, b) => a + b, 0);
  const budget = dailyBudget.maintenance;
  const corrective = week.filter((e) => e.kind === 'Corrective').reduce((s, e) => s + maintenanceCost(e), 0);

  const [f, setF] = useState({ unit: '', kind: 'Corrective' as MaintenanceKind, desc: '', parts: '', labor: '0' });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  const d = { parts: n(f.parts), labor: n(f.labor) };
  const valid = f.unit.trim() !== '' && f.desc.trim() !== '' && ok(d.parts, d.labor);

  return (
    <>
      <DayStrip category="maintenance" totals={totals} />

      <Readout cols={4}>
        <ReadoutCell label={`Maintenance · ${dayLabel(date)}`} value={php(dayTotal)} meta={<Delta amount={dayTotal - budget} pct={variancePct(dayTotal, budget)} />} />
        <ReadoutCell label="Week to date" value={php(weekTotal)} meta={<Delta amount={weekTotal - budget * 7} pct={variancePct(weekTotal, budget * 7)} />} />
        <ReadoutCell label="Corrective share" value={`${Math.round((corrective / (weekTotal || 1)) * 100)}%`} meta="breakdowns vs planned upkeep" />
        <ReadoutCell label="Work orders this week" value={week.length} meta={`${week.filter((e) => e.kind === 'Corrective').length} corrective`} />
      </Readout>

      <EntryForm
        title={`Log maintenance for ${dayLabel(date)}`}
        valid={valid}
        preview={<span className="num">{php(valid ? d.parts + d.labor : 0)}</span>}
        onSubmit={() => {
          add('maintenance', { date, unit: f.unit.trim(), kind: f.kind, description: f.desc.trim(), parts: d.parts, labor: d.labor });
          setF({ ...f, unit: '', desc: '', parts: '' });
        }}
      >
        <Field label="Equipment" value={f.unit} onChange={set('unit')} placeholder="e.g. EX-01" />
        <SelectField label="Type" options={KINDS} value={f.kind} onChange={set('kind')} />
        <Field label="Description" value={f.desc} onChange={set('desc')} placeholder="What was done" />
        <Field label="Parts ₱" numeric value={f.parts} onChange={set('parts')} />
        <Field label="Repair labor ₱" numeric value={f.labor} onChange={set('labor')} />
      </EntryForm>

      <Panel refNo="08-A" title="Maintenance & repairs — this week" sub={`Total = parts + labor. Highlighted rows are ${dayLabel(date)}.`} flush>
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Date</th>
                <th>Equipment</th>
                <th>Type</th>
                <th>Description</th>
                <th className="r">Parts</th>
                <th className="r">Labor</th>
                <th className="r">Total</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {[...week]
                .sort((a, b) => a.date.localeCompare(b.date))
                .map((e) => (
                  <tr key={e.id} style={e.date === date ? { background: 'var(--accent-wash)' } : undefined}>
                    <td className="num">{dayLabel(e.date)}</td>
                    <td>{e.unit}</td>
                    <td>
                      <span className={`tag ${e.kind === 'Corrective' ? 'tag--watch' : 'tag--ok'}`}>{e.kind}</span>
                    </td>
                    <td>{e.description}</td>
                    <td className="r num">{php(e.parts)}</td>
                    <td className="r num">{php(e.labor)}</td>
                    <td className="r num">{php(maintenanceCost(e))}</td>
                    <td className="r">
                      <DeleteButton onClick={() => remove('maintenance', e.id)} label={e.description} />
                    </td>
                  </tr>
                ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="small muted" style={{ textAlign: 'center' }}>
                    Nothing logged on {dayLabel(date)}.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4}>Week total</td>
                <td className="r num">{php(week.reduce((s, e) => s + e.parts, 0))}</td>
                <td className="r num">{php(week.reduce((s, e) => s + e.labor, 0))}</td>
                <td className="r num">{php(weekTotal)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </Panel>
    </>
  );
}
