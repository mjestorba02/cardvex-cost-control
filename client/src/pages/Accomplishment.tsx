import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CalendarDays, CalendarRange } from 'lucide-react';
import { ACTIVITY_BOQ, boq, CURRENT_WEEK, production, WEEK_DATES, weeklyQtyHistory } from '@/data/seed';
import type { AccomplishmentEntry } from '@/data/types';
import { alignment, severity } from '@/lib/calc';
import { dayLabel, dowLabel, fullDate, pct, php, phpShort, qty } from '@/lib/format';
import { useMetrics } from '@/lib/metrics';
import { useProject } from '@/store/ProjectStore';
import { Panel } from '@/components/ui/Panel';
import { Readout, ReadoutCell } from '@/components/ui/Readout';
import { AlignmentTag } from '@/components/ui/Status';
import { StackedBars } from '@/components/charts/StackedBars';
import { useActiveDate } from './daily/DailyShell';

const UNIT_COST: Record<string, number> = Object.fromEntries(production.map((p) => [p.activity, p.unitCost]));
const SEV_COLOR = { over: 'var(--over-mark)', watch: 'var(--watch-mark)', ok: 'var(--rule-strong)', under: 'var(--good-mark)' };

/** Accomplishment is scored as a shortfall so it reuses the cost thresholds: 10%+ short = Behind, 2%+ ahead = Ahead. */
const shortfall = (actual: number, planned: number) => (planned ? (planned - actual) / planned : 0);

/** Value-weighted progress: quantities in different units are combined through their unit costs. */
function weighted(rows: { activity: string; planned: number; actual: number }[]) {
  const pv = rows.reduce((s, r) => s + r.planned * UNIT_COST[r.activity], 0);
  const ev = rows.reduce((s, r) => s + r.actual * UNIT_COST[r.activity], 0);
  return { pv, ev, ratio: pv ? ev / pv : 0 };
}

function QtyTag({ actual, planned }: { actual: number; planned: number }) {
  // Positive = shortfall. Show the achieved % beside the status word.
  const s = shortfall(actual, planned);
  const sev = severity(s);
  const label = sev === 'over' ? 'Behind' : sev === 'watch' ? 'Slipping' : sev === 'under' ? 'Ahead' : 'On plan';
  return (
    <span className={`tag tag--${sev}`}>
      {label} <span className="num">{pct(planned ? actual / planned : 0, 0)}</span>
    </span>
  );
}

export function Accomplishment() {
  const [params, setParams] = useSearchParams();
  const view = params.get('view') === 'weekly' ? 'weekly' : 'daily';

  return (
    <>
      <div className="row">
        <div className="seg" role="tablist" aria-label="Accomplishment period">
          <button role="tab" aria-selected={view === 'daily'} onClick={() => setParams({}, { replace: true })}>
            <CalendarDays size={15} aria-hidden="true" /> Daily accomplishment
          </button>
          <button role="tab" aria-selected={view === 'weekly'} onClick={() => setParams({ view: 'weekly' }, { replace: true })}>
            <CalendarRange size={15} aria-hidden="true" /> Weekly accomplishment
          </button>
        </div>
        <span className="small muted">
          {view === 'daily' ? 'Record what was physically built each day.' : 'Seven days rolled up and compared with the weekly plan.'}
        </span>
      </div>
      {view === 'daily' ? <DailyView /> : <WeeklyView />}
    </>
  );
}

/* ================================ DAILY ================================ */

function DailyView() {
  const { records, setAccomplishment, setDate } = useProject();
  const m = useMetrics();
  const date = useActiveDate();
  const rows = records.accomplishment.filter((a) => a.date === date);
  const w = weighted(rows);
  const exc = rows.find((r) => r.activity === 'Excavation');
  const dayCost = m.days[WEEK_DATES.indexOf(date)].total;

  const byDay = WEEK_DATES.map((d) => weighted(records.accomplishment.filter((a) => a.date === d)));

  return (
    <>
      <div className="daystrip" role="group" aria-label="Select day">
        {WEEK_DATES.map((d, i) => {
          const s = severity(1 - byDay[i].ratio);
          return (
            <button key={d} aria-pressed={date === d} onClick={() => setDate(d)} aria-label={`${fullDate(d)}: ${pct(byDay[i].ratio, 0)} of planned work`}>
              <span className="daystrip__d">
                {dowLabel(d)} <span className="muted">{dayLabel(d)}</span>
              </span>
              <span className="daystrip__v">{pct(byDay[i].ratio, 0)} of plan</span>
              <span className="daystrip__bar" style={{ background: SEV_COLOR[s] }} aria-hidden="true" />
            </button>
          );
        })}
      </div>

      <Readout cols={4}>
        <ReadoutCell label={`Work done · ${dayLabel(date)}`} value={pct(w.ratio)} meta={<QtyTag actual={w.ev} planned={w.pv} />} />
        <ReadoutCell label="Value of work done" value={phpShort(w.ev)} title={php(w.ev)} meta={`planned ${phpShort(w.pv)} at BOQ rates`} />
        <ReadoutCell label="Excavation" value={`${qty(exc?.actual ?? 0)} m³`} meta={`planned ${qty(exc?.planned ?? 0)} m³`} />
        <ReadoutCell label="Cost per m³ excavated" value={exc?.actual ? php(dayCost / exc.actual) : '—'} meta={`day cost ${phpShort(dayCost)}`} />
      </Readout>

      <Panel
        refNo="12-A"
        title={`Daily accomplishment report — ${fullDate(date)}`}
        sub="Enter actual quantities from the day's survey or foreman's report. Value = quantity × BOQ unit cost."
        flush
      >
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Activity</th>
                <th className="r">Planned</th>
                <th className="r">Actual</th>
                <th className="r">Variance</th>
                <th>Status</th>
                <th className="r">Value of work</th>
                <th style={{ minWidth: 200 }}>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <DailyRow key={r.activity} r={r} onChange={(patch) => setAccomplishment(date, r.activity, patch)} />
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4}>Weighted total · planned value {php(w.pv)}</td>
                <td>
                  <QtyTag actual={w.ev} planned={w.pv} />
                </td>
                <td className="r num">{php(w.ev)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
        <div className="panel__foot">Quantities in different units are combined by value (quantity × BOQ unit cost), so the total reflects how much work was built, not how many units.</div>
      </Panel>

      <Panel refNo="12-B" title="This week, day by day" sub="Bar = actual quantity, tick = planned. Select a day on any chart.">
        <div className="grid grid--2">
          {production.map((p) => {
            const series = WEEK_DATES.map((d) => records.accomplishment.find((a) => a.date === d && a.activity === p.activity));
            const act = series.reduce((s, e) => s + (e?.actual ?? 0), 0);
            const pl = series.reduce((s, e) => s + (e?.planned ?? 0), 0);
            return (
              <div key={p.activity} className="stack" style={{ gap: 4 }}>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <strong style={{ fontSize: 'var(--fs-md)' }}>{p.activity}</strong>
                  <span className="small muted num">
                    {qty(act)} / {qty(pl)} {p.unit}
                  </span>
                </div>
                <StackedBars
                  ariaLabel={`${p.activity}: daily actual against planned this week`}
                  x={WEEK_DATES.map((d) => `${dowLabel(d)} ${dayLabel(d).split(' ')[1]}`)}
                  xTooltip={WEEK_DATES.map(fullDate)}
                  stacks={[{ id: 'a', label: 'Actual', color: 'var(--s3)' }]}
                  values={series.map((e) => [e?.actual ?? 0])}
                  targets={series.map((e) => e?.planned ?? 0)}
                  targetLabel="Planned"
                  yFormat={(v) => qty(v)}
                  tipFormat={(v) => `${qty(v)} ${p.unit}`}
                  selected={WEEK_DATES.indexOf(date)}
                  onSelect={(i) => setDate(WEEK_DATES[i])}
                  height={150}
                />
              </div>
            );
          })}
        </div>
      </Panel>
    </>
  );
}

function DailyRow({ r, onChange }: { r: AccomplishmentEntry; onChange: (p: { actual?: number; remarks?: string }) => void }) {
  const diff = r.actual - r.planned;
  const sev = severity(shortfall(r.actual, r.planned));
  return (
    <tr>
      <td>
        {r.activity}
        <span className="cell-sub">{php(UNIT_COST[r.activity])} / {r.unit}</span>
      </td>
      <td className="r num">
        {qty(r.planned)} {r.unit}
      </td>
      <td className="r">
        <input
          className="input input--num"
          style={{ maxWidth: 110, minHeight: 32 }}
          type="number"
          min={0}
          aria-label={`Actual ${r.activity}, ${r.unit}`}
          value={r.actual}
          onChange={(e) => onChange({ actual: Math.max(0, Number(e.target.value) || 0) })}
        />
      </td>
      <td className={`r num delta--${sev}`}>
        {diff > 0 ? '+' : diff < 0 ? '−' : ''}
        {qty(Math.abs(diff))} {r.unit}
      </td>
      <td>
        <QtyTag actual={r.actual} planned={r.planned} />
      </td>
      <td className="r num">{php(r.actual * UNIT_COST[r.activity])}</td>
      <td>
        <input
          className="input"
          style={{ minHeight: 32 }}
          aria-label={`Remarks for ${r.activity}`}
          placeholder={sev === 'over' || sev === 'watch' ? 'Why short? e.g. rain, breakdown' : 'Optional'}
          value={r.remarks ?? ''}
          onChange={(e) => onChange({ remarks: e.target.value })}
        />
      </td>
    </tr>
  );
}

/* ================================ WEEKLY ================================ */

function WeeklyView() {
  const { records } = useProject();
  const m = useMetrics();
  const weeks = m.weeks.map((w) => w.week);
  const [week, setWeek] = useState(CURRENT_WEEK);
  const [activity, setActivity] = useState(production[0].activity);
  const wi = weeks.indexOf(week);
  const isCurrent = week === CURRENT_WEEK;

  // Weekly actual per activity for any week: history for W22–W28, daily records for the current week
  const actualFor = (act: string, i: number) =>
    i === weeks.length - 1
      ? records.accomplishment.filter((a) => a.activity === act).reduce((s, a) => s + a.actual, 0)
      : weeklyQtyHistory[act][i];

  const rows = production.map((p) => ({ activity: p.activity, unit: p.unit, planned: p.plannedWeekly, actual: actualFor(p.activity, wi) }));
  const w = weighted(rows);
  const wk = m.weeks[wi];
  const spend = wk.actual / wk.budget;

  const cumulative = (act: string) => {
    const items = boq.filter((b) => ACTIVITY_BOQ[act].includes(b.code));
    return { done: items.reduce((s, b) => s + b.doneQty, 0), total: items.reduce((s, b) => s + b.boqQty, 0) };
  };

  const trendAct = production.find((p) => p.activity === activity)!;

  return (
    <>
      <div className="row">
        <span className="eyebrow">Week</span>
        <div className="seg" role="group" aria-label="Select week">
          {weeks.map((x) => (
            <button key={x} aria-pressed={x === week} onClick={() => setWeek(x)}>
              {x}
            </button>
          ))}
        </div>
        <span className="small muted">
          from {dayLabel(wk.start)}
          {isCurrent && ' · current week'}
        </span>
      </div>

      <Readout cols={4}>
        <ReadoutCell label={`${week} progress (by value)`} value={pct(w.ratio)} meta={<QtyTag actual={w.ev} planned={w.pv} />} />
        <ReadoutCell label="Value of work done" value={phpShort(w.ev)} title={php(w.ev)} meta={`planned ${phpShort(w.pv)}`} />
        <ReadoutCell label="Weekly actual cost" value={phpShort(wk.actual)} title={php(wk.actual)} meta={`${pct(spend, 0)} of weekly budget`} />
        <ReadoutCell label="Spend vs. progress" value={`${pct(spend, 0)} / ${pct(w.ratio, 0)}`} meta={<AlignmentTag value={alignment(spend, w.ratio)} short />} />
      </Readout>

      <Panel
        refNo="12-C"
        title={`Weekly accomplishment — ${week}`}
        sub="Planned weekly quantities come from the production baseline (sheet 03)."
        flush
      >
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Activity</th>
                <th className="r">Planned</th>
                <th className="r">Actual</th>
                <th className="r">Variance</th>
                <th>Status</th>
                <th className="r">Planned value</th>
                <th className="r">Value of work</th>
                <th className="r">Cumulative to date</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const c = cumulative(r.activity);
                const diff = r.actual - r.planned;
                return (
                  <tr key={r.activity}>
                    <td>{r.activity}</td>
                    <td className="r num">
                      {qty(r.planned)} {r.unit}
                    </td>
                    <td className="r num">
                      {qty(r.actual)} {r.unit}
                    </td>
                    <td className={`r num delta--${severity(shortfall(r.actual, r.planned))}`}>
                      {diff > 0 ? '+' : diff < 0 ? '−' : ''}
                      {qty(Math.abs(diff))}
                    </td>
                    <td>
                      <QtyTag actual={r.actual} planned={r.planned} />
                    </td>
                    <td className="r num">{php(r.planned * UNIT_COST[r.activity])}</td>
                    <td className="r num">{php(r.actual * UNIT_COST[r.activity])}</td>
                    <td className="r num">
                      {pct(c.done / c.total, 0)}
                      <span className="cell-sub">
                        {qty(c.done)} / {qty(c.total)} {r.unit}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4}>Weighted total</td>
                <td>
                  <QtyTag actual={w.ev} planned={w.pv} />
                </td>
                <td className="r num">{php(w.pv)}</td>
                <td className="r num">{php(w.ev)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </Panel>

      <div className="grid grid--2">
        <Panel
          refNo="12-D"
          title="8-week trend"
          sub="Bar = actual weekly quantity, tick = weekly plan"
          actions={
            <div className="seg" role="group" aria-label="Activity">
              {production.map((p) => (
                <button key={p.activity} aria-pressed={p.activity === activity} onClick={() => setActivity(p.activity)}>
                  {p.activity.split(' ')[0]}
                </button>
              ))}
            </div>
          }
        >
          <StackedBars
            ariaLabel={`${activity}: weekly actual against planned, last eight weeks`}
            x={weeks}
            xTooltip={m.weeks.map((x) => `${x.week} · from ${dayLabel(x.start)}`)}
            stacks={[{ id: 'a', label: 'Actual', color: 'var(--s3)' }]}
            values={weeks.map((_, i) => [actualFor(activity, i)])}
            targets={weeks.map(() => trendAct.plannedWeekly)}
            targetLabel="Planned"
            yFormat={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : qty(v))}
            tipFormat={(v) => `${qty(v)} ${trendAct.unit}`}
            selected={wi}
            onSelect={(i) => setWeek(weeks[i])}
            height={240}
          />
        </Panel>

        <Panel refNo="12-E" title="% of weekly plan achieved" sub="Every activity, every week" flush>
          <div className="table-wrap">
            <table className="tbl tbl--compact">
              <thead>
                <tr>
                  <th>Activity</th>
                  {weeks.map((x) => (
                    <th key={x} className="r" style={x === week ? { color: 'var(--ink)' } : undefined}>
                      {x.slice(1)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {production.map((p) => (
                  <tr key={p.activity}>
                    <td>{p.activity.split(' ')[0]}</td>
                    {weeks.map((x, i) => {
                      const a = actualFor(p.activity, i);
                      const sev = severity(shortfall(a, p.plannedWeekly));
                      return (
                        <td
                          key={x}
                          className={`r num delta--${sev}`}
                          style={x === week ? { background: 'var(--surface-2)', fontWeight: 600 } : undefined}
                          title={`${qty(a)} of ${qty(p.plannedWeekly)} ${p.unit}`}
                        >
                          {Math.round((a / p.plannedWeekly) * 100)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="panel__foot">Red below 90%, amber 90–95%, green above 102%.</div>
        </Panel>
      </div>

      <Panel refNo="12-F" title="Accomplishment to date by BOQ item" sub="Cumulative physical quantities against the bill of quantities" flush>
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Item</th>
                <th>Description</th>
                <th className="r">BOQ qty</th>
                <th className="r">Done</th>
                <th className="r">Remaining</th>
                <th className="r">% done</th>
                <th className="r">Value earned</th>
              </tr>
            </thead>
            <tbody>
              {boq.map((b) => (
                <tr key={b.code}>
                  <td className="num">{b.code}</td>
                  <td>{b.description}</td>
                  <td className="r num">
                    {qty(b.boqQty)} {b.unit}
                  </td>
                  <td className="r num">{qty(b.doneQty)}</td>
                  <td className="r num">{qty(b.boqQty - b.doneQty)}</td>
                  <td className="r num">{pct(b.doneQty / b.boqQty, 0)}</td>
                  <td className="r num">{php(b.doneQty * b.unitCost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
