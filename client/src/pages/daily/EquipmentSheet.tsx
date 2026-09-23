import { WEEK_DATES, dailyBudget } from '@/data/seed';
import type { EquipmentEntry } from '@/data/types';
import { equipmentCost, equipmentHours, equipmentIdleCost, utilization, variancePct } from '@/lib/calc';
import { dayLabel, pct, php, phpShort, qty } from '@/lib/format';
import { useProject } from '@/store/ProjectStore';
import { Panel } from '@/components/ui/Panel';
import { Readout, ReadoutCell } from '@/components/ui/Readout';
import { Delta } from '@/components/ui/Status';
import { num } from '@/components/forms/FormModal';
import { useRecordCrud, type CrudSpec } from '@/components/forms/useRecordCrud';
import { DayStrip, useActiveDate } from './DailyShell';

const SPEC: CrudSpec<EquipmentEntry> = {
  kind: 'equipment',
  noun: 'equipment line',
  fields: [
    { name: 'unit', label: 'Equipment unit', placeholder: 'e.g. EX-02 Excavator PC200', full: true },
    { name: 'count', label: 'No. of units', kind: 'number', step: 1, min: 1 },
    { name: 'rate', label: 'Rental rate ₱/hr', kind: 'number', step: 50 },
    { name: 'op', label: 'Operating hrs', kind: 'number', step: 0.5, hint: 'Productive hours' },
    { name: 'sb', label: 'Standby hrs', kind: 'number', step: 0.5, hint: 'On site, not working' },
    { name: 'idle', label: 'Idle hrs', kind: 'number', step: 0.5, hint: 'Billed but unused' },
  ],
  defaults: { count: '1', op: '8', sb: '0', idle: '0' },
  toValues: (r) => ({
    unit: r.unit,
    count: String(r.count),
    rate: String(r.ratePerHour),
    op: String(r.operatingHrs),
    sb: String(r.standbyHrs),
    idle: String(r.idleHrs),
  }),
  fromValues: (v) => ({
    unit: v.unit.trim(),
    count: num(v.count),
    ratePerHour: num(v.rate),
    operatingHrs: num(v.op),
    standbyHrs: num(v.sb),
    idleHrs: num(v.idle),
  }),
  computed: (v) => {
    const total = num(v.count) * num(v.rate) * (num(v.op) + num(v.sb) + num(v.idle));
    return <span className="num">{Number.isFinite(total) ? php(total) : '—'}</span>;
  },
  computedLabel: 'Actual cost · units × rate × hours',
  describe: (r) => r.unit,
};

export function EquipmentSheet() {
  const { records } = useProject();
  const date = useActiveDate();
  const rows = records.equipment.filter((e) => e.date === date);
  const totals = WEEK_DATES.map((d) => records.equipment.filter((e) => e.date === d).reduce((s, e) => s + equipmentCost(e), 0));
  const dayTotal = rows.reduce((s, e) => s + equipmentCost(e), 0);
  const opHrs = rows.reduce((s, e) => s + e.operatingHrs * e.count, 0);
  const allHrs = rows.reduce((s, e) => s + equipmentHours(e) * e.count, 0);
  const idleCost = rows.reduce((s, e) => s + equipmentIdleCost(e), 0);
  const acc = records.accomplishment.find((a) => a.date === date);
  const budget = dailyBudget.equipment;

  const { AddButton, RowActions, modals } = useRecordCrud(SPEC, date);

  // Week view per unit
  const units = Array.from(new Set(records.equipment.map((e) => e.unit)));

  return (
    <>
      <DayStrip category="equipment" totals={totals} />

      <Readout cols={5}>
        <ReadoutCell label={`Rental cost · ${dayLabel(date)}`} value={php(dayTotal)} meta={<Delta amount={dayTotal - budget} pct={variancePct(dayTotal, budget)} />} />
        <ReadoutCell label="Utilization" value={pct(allHrs ? opHrs / allHrs : 0)} meta={`${qty(opHrs)} of ${qty(allHrs)} unit-hrs operating`} />
        <ReadoutCell label="Idle-hour cost" value={php(idleCost)} meta={`${pct(dayTotal ? idleCost / dayTotal : 0)} of today's rental`} />
        <ReadoutCell label="Cost per m³" value={acc?.actual ? php(dayTotal / acc.actual) : '—'} meta={acc ? `${qty(acc.actual)} m³ excavated` : 'no accomplishment'} />
        <ReadoutCell label="Productivity" value={opHrs ? `${qty((acc?.actual ?? 0) / opHrs)} m³/hr` : '—'} meta="per operating unit-hour" />
      </Readout>

      <Panel
        refNo="04-A"
        title={`Equipment log — ${dayLabel(date)}`}
        sub="Actual cost = units × rate × (operating + standby + idle hrs)"
        flush
        actions={<AddButton label="Add equipment" />}
      >
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Equipment unit</th>
                <th className="r">Units</th>
                <th className="r">Rate/hr</th>
                <th className="r">Operating</th>
                <th className="r">Standby</th>
                <th className="r">Idle</th>
                <th className="r">Utilization</th>
                <th className="r">Actual cost</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => (
                <tr key={e.id}>
                  <td>{e.unit}</td>
                  <td className="r num">{e.count}</td>
                  <td className="r num">{php(e.ratePerHour)}</td>
                  <td className="r num">{qty(e.operatingHrs)} h</td>
                  <td className="r num">{qty(e.standbyHrs)} h</td>
                  <td className={`r num ${e.idleHrs >= 1.5 ? 'delta--watch' : ''}`}>{qty(e.idleHrs)} h</td>
                  <td className="r num">{pct(utilization(e), 0)}</td>
                  <td className="r num">{php(equipmentCost(e))}</td>
                  <td>
                    <RowActions row={e} />
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={9} className="empty">
                    No equipment recorded for this day yet.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr>
                <td>Total · {rows.length} lines</td>
                <td className="r num">{rows.reduce((s, e) => s + e.count, 0)}</td>
                <td />
                <td className="r num">{qty(rows.reduce((s, e) => s + e.operatingHrs * e.count, 0))} h</td>
                <td className="r num">{qty(rows.reduce((s, e) => s + e.standbyHrs * e.count, 0))} h</td>
                <td className="r num">{qty(rows.reduce((s, e) => s + e.idleHrs * e.count, 0))} h</td>
                <td className="r num">{pct(allHrs ? opHrs / allHrs : 0, 0)}</td>
                <td className="r num">{php(dayTotal)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </Panel>

      <Panel refNo="04-B" title="Week by unit" sub="Operating vs. non-productive hours and rental cost, Sept 16–22" flush>
        <div className="table-wrap">
          <table className="tbl tbl--compact">
            <thead>
              <tr>
                <th>Unit</th>
                <th className="r">Operating</th>
                <th className="r">Standby + idle</th>
                <th className="r">Utilization</th>
                <th className="r">Idle cost</th>
                <th className="r">Week cost</th>
              </tr>
            </thead>
            <tbody>
              {units.map((u) => {
                const rs = records.equipment.filter((e) => e.unit === u);
                const op = rs.reduce((s, e) => s + e.operatingHrs * e.count, 0);
                const non = rs.reduce((s, e) => s + (e.standbyHrs + e.idleHrs) * e.count, 0);
                return (
                  <tr key={u}>
                    <td>{u}</td>
                    <td className="r num">{qty(op)} h</td>
                    <td className="r num">{qty(non)} h</td>
                    <td className="r num">{pct(op / (op + non || 1), 0)}</td>
                    <td className="r num">{phpShort(rs.reduce((s, e) => s + equipmentIdleCost(e), 0))}</td>
                    <td className="r num">{php(rs.reduce((s, e) => s + equipmentCost(e), 0))}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      {modals}
    </>
  );
}
