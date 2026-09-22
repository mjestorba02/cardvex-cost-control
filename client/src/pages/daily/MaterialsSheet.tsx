import { useState } from 'react';
import { WEEK_DATES, dailyBudget } from '@/data/seed';
import { materialConsumedValue, materialCost, variancePct } from '@/lib/calc';
import { dayLabel, pct, php, qty } from '@/lib/format';
import { useProject } from '@/store/ProjectStore';
import { Panel } from '@/components/ui/Panel';
import { Readout, ReadoutCell } from '@/components/ui/Readout';
import { Delta } from '@/components/ui/Status';
import { Field } from '@/components/ui/Field';
import { DayStrip, DeleteButton, EntryForm, n, ok, useActiveDate } from './DailyShell';

export function MaterialsSheet() {
  const { records, add, remove } = useProject();
  const date = useActiveDate();
  const rows = records.materials.filter((e) => e.date === date);
  const totals = WEEK_DATES.map((d) => records.materials.filter((e) => e.date === d).reduce((s, e) => s + materialCost(e), 0));
  const dayTotal = rows.reduce((s, e) => s + materialCost(e), 0);
  const consumed = rows.reduce((s, e) => s + materialConsumedValue(e), 0);
  const wasteVal = rows.reduce((s, e) => s + e.wastage * e.unitCost, 0);
  const acc = records.accomplishment.find((a) => a.date === date);
  const budget = dailyBudget.materials;

  const [f, setF] = useState({ material: '', unit: 'm³', delivered: '', consumed: '0', cost: '', waste: '0' });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  const d = { delivered: n(f.delivered), consumed: n(f.consumed), cost: n(f.cost), waste: n(f.waste) };
  const valid = f.material.trim() !== '' && f.unit.trim() !== '' && ok(d.delivered, d.consumed, d.cost, d.waste);

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

      <EntryForm
        title={`Record material for ${dayLabel(date)}`}
        valid={valid}
        preview={<span className="num">{php(valid ? d.delivered * d.cost : 0)}</span>}
        onSubmit={() => {
          add('materials', { date, material: f.material.trim(), unit: f.unit.trim(), delivered: d.delivered, consumed: d.consumed, unitCost: d.cost, wastage: d.waste });
          setF({ ...f, material: '', delivered: '', cost: '' });
        }}
      >
        <Field label="Material" value={f.material} onChange={set('material')} placeholder="e.g. Gravel" />
        <Field label="Unit" value={f.unit} onChange={set('unit')} />
        <Field label="Qty delivered" numeric value={f.delivered} onChange={set('delivered')} />
        <Field label="Qty consumed" numeric value={f.consumed} onChange={set('consumed')} />
        <Field label="Unit cost ₱" numeric value={f.cost} onChange={set('cost')} />
        <Field label="Wastage qty" numeric value={f.waste} onChange={set('waste')} />
      </EntryForm>

      <Panel refNo="07-A" title={`Materials — ${dayLabel(date)}`} sub="Actual cost is booked on delivery: qty delivered × unit cost" flush>
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
                  <td className="r">
                    <DeleteButton onClick={() => remove('materials', e.id)} label={e.material} />
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
    </>
  );
}
