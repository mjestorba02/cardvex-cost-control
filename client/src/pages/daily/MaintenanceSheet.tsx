import { WEEK_DATES, dailyBudget } from '@/data/seed';
import type { MaintenanceEntry, MaintenanceKind } from '@/data/types';
import { maintenanceCost, variancePct } from '@/lib/calc';
import { dayLabel, php } from '@/lib/format';
import { useProject } from '@/store/ProjectStore';
import { Panel } from '@/components/ui/Panel';
import { Readout, ReadoutCell } from '@/components/ui/Readout';
import { Delta } from '@/components/ui/Status';
import { num } from '@/components/forms/FormModal';
import { useRecordCrud, type CrudSpec } from '@/components/forms/useRecordCrud';
import { DayStrip, useActiveDate } from './DailyShell';

const KINDS: MaintenanceKind[] = ['Preventive', 'Corrective', 'Tires', 'Lubricants', 'Spare parts'];

const SPEC: CrudSpec<MaintenanceEntry> = {
  kind: 'maintenance',
  noun: 'work order',
  fields: [
    { name: 'unit', label: 'Equipment', placeholder: 'e.g. EX-01 Excavator PC200' },
    { name: 'kind', label: 'Type', kind: 'select', options: KINDS },
    { name: 'desc', label: 'Description of work', placeholder: 'e.g. Hydraulic hose & seal repair', full: true },
    { name: 'parts', label: 'Parts ₱', kind: 'number', step: 100 },
    { name: 'labor', label: 'Repair labor ₱', kind: 'number', step: 100 },
  ],
  defaults: { kind: 'Corrective', labor: '0' },
  toValues: (r) => ({ unit: r.unit, kind: r.kind, desc: r.description, parts: String(r.parts), labor: String(r.labor) }),
  fromValues: (v) => ({
    unit: v.unit.trim(),
    kind: v.kind as MaintenanceKind,
    description: v.desc.trim(),
    parts: num(v.parts),
    labor: num(v.labor),
  }),
  computed: (v) => {
    const total = num(v.parts) + num(v.labor);
    return <span className="num">{Number.isFinite(total) ? php(total) : '—'}</span>;
  },
  computedLabel: 'Total · parts + labor',
  describe: (r) => `${r.unit} — ${r.description}`,
};

export function MaintenanceSheet() {
  const { records } = useProject();
  const date = useActiveDate();
  const rows = records.maintenance.filter((e) => e.date === date);
  const week = records.maintenance;
  const totals = WEEK_DATES.map((d) => week.filter((e) => e.date === d).reduce((s, e) => s + maintenanceCost(e), 0));
  const dayTotal = rows.reduce((s, e) => s + maintenanceCost(e), 0);
  const weekTotal = totals.reduce((a, b) => a + b, 0);
  const budget = dailyBudget.maintenance;
  const corrective = week.filter((e) => e.kind === 'Corrective').reduce((s, e) => s + maintenanceCost(e), 0);

  const { AddButton, RowActions, modals } = useRecordCrud(SPEC, date);

  return (
    <>
      <DayStrip category="maintenance" totals={totals} />

      <Readout cols={4}>
        <ReadoutCell label={`Maintenance · ${dayLabel(date)}`} value={php(dayTotal)} meta={<Delta amount={dayTotal - budget} pct={variancePct(dayTotal, budget)} />} />
        <ReadoutCell label="Week to date" value={php(weekTotal)} meta={<Delta amount={weekTotal - budget * 7} pct={variancePct(weekTotal, budget * 7)} />} />
        <ReadoutCell label="Corrective share" value={`${Math.round((corrective / (weekTotal || 1)) * 100)}%`} meta="breakdowns vs planned upkeep" />
        <ReadoutCell label="Work orders this week" value={week.length} meta={`${week.filter((e) => e.kind === 'Corrective').length} corrective`} />
      </Readout>

      <Panel
        refNo="08-A"
        title="Maintenance & repairs — this week"
        sub={`Total = parts + labor. Highlighted rows are ${dayLabel(date)}.`}
        flush
        actions={<AddButton label="Log work order" />}
      >
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
                    <td>
                      <RowActions row={e} />
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

      {modals}
    </>
  );
}
