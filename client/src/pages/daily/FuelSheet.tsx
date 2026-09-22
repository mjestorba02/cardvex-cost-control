import { useState } from 'react';
import { WEEK_DATES, dailyBudget } from '@/data/seed';
import { fuelCost, litersPerHour, variancePct } from '@/lib/calc';
import { dayLabel, php, qty } from '@/lib/format';
import { useProject } from '@/store/ProjectStore';
import { Panel } from '@/components/ui/Panel';
import { Readout, ReadoutCell } from '@/components/ui/Readout';
import { Delta } from '@/components/ui/Status';
import { Field } from '@/components/ui/Field';
import { LineChart } from '@/components/charts/LineChart';
import { DayStrip, DeleteButton, EntryForm, n, ok, useActiveDate } from './DailyShell';

export function FuelSheet() {
  const { records, add, remove } = useProject();
  const date = useActiveDate();
  const rows = records.fuel.filter((e) => e.date === date);
  const totals = WEEK_DATES.map((d) => records.fuel.filter((e) => e.date === d).reduce((s, e) => s + fuelCost(e), 0));
  const dayTotal = rows.reduce((s, e) => s + fuelCost(e), 0);
  const liters = rows.reduce((s, e) => s + e.liters, 0);
  const hrs = rows.reduce((s, e) => s + e.hoursRun, 0);
  const price = rows[0]?.pricePerLiter ?? 0;
  const acc = records.accomplishment.find((a) => a.date === date);
  const budget = dailyBudget.fuel;

  const [f, setF] = useState({ unit: '', meter: '', liters: '', price: String(price || 65), hrs: '8' });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  const d = { meter: n(f.meter), liters: n(f.liters), price: n(f.price), hrs: n(f.hrs) };
  const valid = f.unit.trim() !== '' && ok(d.meter, d.liters, d.price, d.hrs);

  const weekLph = WEEK_DATES.map((day) => {
    const r = records.fuel.filter((e) => e.date === day);
    const h = r.reduce((s, e) => s + e.hoursRun, 0);
    return h ? r.reduce((s, e) => s + e.liters, 0) / h : null;
  });
  const weekPrice = WEEK_DATES.map((day) => records.fuel.find((e) => e.date === day)?.pricePerLiter ?? null);

  return (
    <>
      <DayStrip category="fuel" totals={totals} />

      <Readout cols={5}>
        <ReadoutCell label={`Fuel cost · ${dayLabel(date)}`} value={php(dayTotal)} meta={<Delta amount={dayTotal - budget} pct={variancePct(dayTotal, budget)} />} />
        <ReadoutCell label="Liters consumed" value={`${qty(liters)} L`} meta={`diesel @ ${php(price)}/L`} />
        <ReadoutCell label="Liters / hour" value={qty(hrs ? liters / hrs : 0)} meta={`${qty(hrs)} unit-hrs run`} />
        <ReadoutCell label="Fuel cost / hour" value={php(hrs ? dayTotal / hrs : 0)} meta="per operating unit-hour" />
        <ReadoutCell label="Fuel cost / m³" value={acc?.actual ? php(dayTotal / acc.actual) : '—'} meta={acc ? `${qty(acc.actual)} m³ excavated` : ''} />
      </Readout>

      <div className="grid grid--main-side">
        <div className="stack">
          <EntryForm
            title={`Add fuel issue for ${dayLabel(date)}`}
            valid={valid}
            preview={
              <span className="num">
                {php(valid ? d.liters * d.price : 0)}
                {valid && d.hrs > 0 && <span className="muted"> · {qty(d.liters / d.hrs)} L/hr</span>}
              </span>
            }
            onSubmit={() => {
              add('fuel', { date, unit: f.unit.trim(), hourMeter: d.meter, liters: d.liters, pricePerLiter: d.price, hoursRun: d.hrs });
              setF({ ...f, unit: '', meter: '', liters: '' });
            }}
          >
            <Field label="Equipment unit" value={f.unit} onChange={set('unit')} placeholder="e.g. EX-01" />
            <Field label="Hour meter" numeric value={f.meter} onChange={set('meter')} />
            <Field label="Liters" numeric value={f.liters} onChange={set('liters')} />
            <Field label="Diesel ₱/L" numeric value={f.price} onChange={set('price')} />
            <Field label="Hours run" numeric value={f.hrs} onChange={set('hrs')} />
          </EntryForm>

          <Panel refNo="05-A" title={`Fuel log — ${dayLabel(date)}`} sub="Fuel cost = liters × diesel price" flush>
            <div className="table-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Equipment</th>
                    <th className="r">Hour meter</th>
                    <th className="r">Liters</th>
                    <th className="r">Diesel price</th>
                    <th className="r">L/hr</th>
                    <th className="r">Fuel cost</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((e) => (
                    <tr key={e.id}>
                      <td>{e.unit}</td>
                      <td className="r num">{e.hourMeter.toLocaleString()}</td>
                      <td className="r num">{qty(e.liters)} L</td>
                      <td className="r num">{php(e.pricePerLiter)}</td>
                      <td className="r num">{qty(litersPerHour(e))}</td>
                      <td className="r num">{php(fuelCost(e))}</td>
                      <td className="r">
                        <DeleteButton onClick={() => remove('fuel', e.id)} label={e.unit} />
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={7} className="empty">
                        No fuel issued on this day.
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr>
                    <td>Total</td>
                    <td />
                    <td className="r num">{qty(liters)} L</td>
                    <td />
                    <td className="r num">{qty(hrs ? liters / hrs : 0)}</td>
                    <td className="r num">{php(dayTotal)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </Panel>
        </div>

        <div className="stack">
          <Panel refNo="05-B" title="Burn rate this week" sub="Fleet liters per operating unit-hour">
            <LineChart
              ariaLabel="Fleet liters per hour, daily this week"
              x={WEEK_DATES.map(dayLabel)}
              height={180}
              yFormat={(v) => v.toFixed(1)}
              tipFormat={(v) => `${v.toFixed(2)} L/hr`}
              yMin={8}
              series={[{ id: 'lph', label: 'L/hr', color: 'var(--s2)', values: weekLph, markers: true }]}
            />
          </Panel>
          <Panel refNo="05-C" title="Diesel price" sub="Price change raises cost without more work done">
            <LineChart
              ariaLabel="Diesel price per liter, daily this week"
              x={WEEK_DATES.map(dayLabel)}
              height={150}
              yFormat={(v) => `₱${v}`}
              tipFormat={(v) => `${php(v)}/L`}
              yMin={60}
              yMax={70}
              series={[{ id: 'p', label: 'Diesel', color: 'var(--s-plan)', values: weekPrice, markers: true }]}
            />
          </Panel>
        </div>
      </div>
    </>
  );
}
