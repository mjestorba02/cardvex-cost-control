import { WEEK_DATES, dailyBudget } from '@/data/seed';
import type { MaterialEntry } from '@/data/types';
import { materialConsumedValue, materialCost, variancePct } from '@/lib/calc';
import { dayLabel, pct, php, qty } from '@/lib/format';
import { useProject } from '@/store/ProjectStore';
import { Panel } from '@/components/ui/Panel';
import { Readout, ReadoutCell } from '@/components/ui/Readout';
import { Delta } from '@/components/ui/Status';
import { num } from '@/components/forms/FormModal';
import { useRecordCrud, type CrudSpec } from '@/components/forms/useRecordCrud';
import { DayStrip, useActiveDate } from './DailyShell';

const SPEC: CrudSpec<MaterialEntry> = {
  kind: 'materials',
  noun: 'material record',
  fields: [
    { name: 'material', label: 'Material', placeholder: 'e.g. Gravel (subbase)', full: true },
    { name: 'unit', label: 'Unit', placeholder: 'm³, bags, pcs' },
    { name: 'cost', label: 'Unit cost ₱', kind: 'number', step: 10 },
    { name: 'delivered', label: 'Qty delivered', kind: 'number', step: 1, hint: 'Cost is booked on delivery' },
    { name: 'consumed', label: 'Qty consumed', kind: 'number', step: 1, hint: 'Placed into the works' },
    { name: 'waste', label: 'Wastage qty', kind: 'number', step: 1 },
  ],
  defaults: { unit: 'm³', consumed: '0', waste: '0' },
  toValues: (r) => ({
    material: r.material,
    unit: r.unit,
    cost: String(r.unitCost),
    delivered: String(r.delivered),
    consumed: String(r.consumed),
    waste: String(r.wastage),
  }),
  fromValues: (v) => ({
    material: v.material.trim(),
    unit: v.unit.trim(),
    unitCost: num(v.cost),
    delivered: num(v.delivered),
    consumed: num(v.consumed),
    wastage: num(v.waste),
  }),
  computed: (v) => {
    const total = num(v.delivered) * num(v.cost);
    return <span className="num">{Number.isFinite(total) ? php(total) : '—'}</span>;
  },
  computedLabel: 'Actual cost · delivered × unit cost',
  describe: (r) => `${r.material} — ${r.delivered} ${r.unit}`,
};

export function MaterialsSheet() {
  const { records } = useProject();
  const date = useActiveDate();
  const rows = records.materials.filter((e) => e.date === date);
  const totals = WEEK_DATES.map((d) => records.materials.filter((e) => e.date === d).reduce((s, e) => s + materialCost(e), 0));
  const dayTotal = rows.reduce((s, e) => s + materialCost(e), 0);
  const consumed = rows.reduce((s, e) => s + materialConsumedValue(e), 0);
  const wasteVal = rows.reduce((s, e) => s + e.wastage * e.unitCost, 0);
  const acc = records.accomplishment.find((a) => a.date === date);
  const budget = dailyBudget.materials;

  const { AddButton, RowActions, modals } = useRecordCrud(SPEC, date);

  // Material balance & unit price movement across the week
  const materials = Array.from(new Set(records.materials.map((m) => m.material)));
  const balance = materials.map((mat) => {
    const rs = records.materials.filter((m) => m.material === mat).sort((a, b) => a.date.localeCompare(b.date));
    const del = rs.reduce((s, r) => s + r.delivered, 0);
    const con = rs.reduce((s, r) => s + r.consumed, 0);
    const waste = rs.reduce((s, r) => s + r.wastage, 0);
    const first = rs[0]?.unitCost ?? 0;
    const last = rs[rs.length - 1]?.unitCost ?? 0;
    return { mat, unit: rs[0]?.unit ?? '', del, con, waste, bal: del - con - waste, first, last };
  });

  return (
    <>
      <DayStrip category="materials" totals={totals} />

      <Readout cols={5}>
        <ReadoutCell label={`Delivered value · ${dayLabel(date)}`} value={php(dayTotal)} meta={<Delta amount={dayTotal - budget} pct={variancePct(dayTotal, budget)} />} />
        <ReadoutCell label="Consumed value" value={php(consumed)} meta="placed into the works" />
        <ReadoutCell label="Wastage" value={php(wasteVal)} meta={`${pct(consumed ? wasteVal / consumed : 0)} of consumption`} />
        <ReadoutCell label="Material cost / m³" value={acc?.actual ? php(consumed / acc.actual) : '—'} meta="consumed value ÷ accomplishment" />
        <ReadoutCell
          label="Unit price changes"
          value={balance.filter((b) => b.last !== b.first).length}
          meta={balance.filter((b) => b.last !== b.first).map((b) => b.mat.split(' ')[0]).join(', ') || 'none this week'}
        />
      </Readout>

      <Panel
        refNo="07-A"
        title={`Materials — ${dayLabel(date)}`}
        sub="Actual cost is booked on delivery: qty delivered × unit cost"
        flush
        actions={<AddButton label="Record material" />}
      >
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Material</th>
                <th className="r">Delivered</th>
                <th className="r">Consumed</th>
                <th className="r">Wastage</th>
                <th className="r">Unit cost</th>
                <th className="r">Actual cost</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => (
                <tr key={e.id}>
                  <td>{e.material}</td>
                  <td className="r num">
                    {qty(e.delivered)} {e.unit}
                  </td>
                  <td className="r num">
                    {qty(e.consumed)} {e.unit}
                  </td>
                  <td className="r num">{e.wastage ? `${qty(e.wastage)} ${e.unit}` : <span className="muted">—</span>}</td>
                  <td className="r num">{php(e.unitCost)}</td>
                  <td className="r num">{php(materialCost(e))}</td>
                  <td>
                    <RowActions row={e} />
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="empty">
                    No deliveries or consumption recorded.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={5}>Total delivered value</td>
                <td className="r num">{php(dayTotal)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </Panel>

      <Panel refNo="07-B" title="Material balance — this week" sub="Balance = delivered − consumed − wastage. Price change compares first and latest unit cost." flush>
        <div className="table-wrap">
          <table className="tbl tbl--compact">
            <thead>
              <tr>
                <th>Material</th>
                <th className="r">Delivered</th>
                <th className="r">Consumed</th>
                <th className="r">Wastage</th>
                <th className="r">On-site balance</th>
                <th className="r">Unit price</th>
              </tr>
            </thead>
            <tbody>
              {balance.map((b) => (
                <tr key={b.mat}>
                  <td>{b.mat}</td>
                  <td className="r num">{qty(b.del)}</td>
                  <td className="r num">{qty(b.con)}</td>
                  <td className="r num">
                    {qty(b.waste)} <span className="muted">({pct(b.con ? b.waste / b.con : 0)})</span>
                  </td>
                  <td className="r num">
                    {qty(b.bal)} {b.unit}
                  </td>
                  <td className="r num">
                    {b.last !== b.first ? (
                      <span className="delta delta--over">
                        {php(b.first)} → {php(b.last)}
                      </span>
                    ) : (
                      php(b.last)
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {modals}
    </>
  );
}
