import { Link } from 'react-router-dom';
import { boq, budget, contract, dailyBudget, production, TODAY } from '@/data/seed';
import { CATEGORY_LABEL, CATEGORY_VAR } from '@/data/labels';
import { dayLabel, fullDate, pct, php, phpShort, qty } from '@/lib/format';
import { DAILY_BUDGET_TOTAL, REVISED_CONTRACT, TOTAL_BUDGET, useMetrics } from '@/lib/metrics';
import { Panel } from '@/components/ui/Panel';
import { Readout, ReadoutCell } from '@/components/ui/Readout';

const MAX_LINE = Math.max(...budget.map((b) => b.amount));
const vo = contract.variationOrders.reduce((s, v) => s + v.amount, 0);

/* ============================ 01 PROJECT SUMMARY ============================ */

const FLOW: { t: string; to?: string; k: string }[] = [
  { k: '02', t: 'Contract & BOQ', to: '/contract' },
  { k: '03', t: 'Project budget', to: '/budget' },
  { k: '03', t: 'Cost baseline', to: '/budget' },
  { k: '04–08', t: 'Daily records', to: '/daily/equipment' },
  { k: '09', t: 'Daily consolidation', to: '/daily/summary' },
  { k: '09', t: 'Compare with budget', to: '/daily/summary' },
  { k: '10', t: 'Weekly cost report', to: '/weekly' },
  { k: '12–13', t: 'Cost + accomplishment', to: '/accomplishment' },
  { k: '14', t: 'Variance analysis', to: '/variance' },
  { k: '11', t: 'Monthly cost report', to: '/monthly' },
  { k: '16', t: 'Cumulative cost', to: '/' },
  { k: '15', t: 'Forecast final cost', to: '/forecast' },
  { k: '—', t: 'Cost control / corrective action', to: '/variance' },
];

export function ProjectSummary() {
  const m = useMetrics();
  const timePct = m.elapsedMonths / contract.durationMonths;
  return (
    <>
      <Readout cols={4}>
        <ReadoutCell label="Revised contract" value={phpShort(REVISED_CONTRACT)} title={php(REVISED_CONTRACT)} meta={`original ${phpShort(contract.originalAmount, 1)} + ${contract.variationOrders.length} VOs`} />
        <ReadoutCell label="Approved project budget" value={phpShort(TOTAL_BUDGET)} meta={`${pct(TOTAL_BUDGET / REVISED_CONTRACT)} of contract`} />
        <ReadoutCell label="Time elapsed" value={pct(timePct, 0)} meta={`${m.elapsedMonths.toFixed(1)} of ${contract.durationMonths} months`} />
        <ReadoutCell label="Work accomplished" value={pct(m.actualProgress, 0)} meta={`planned ${pct(m.plannedProgress, 0)}`} />
      </Readout>

      <Panel refNo="01-A" title="Project timeline" sub={`${fullDate(contract.startDate)} → ${fullDate(contract.targetCompletion)}`}>
        <div className="stack">
          <div style={{ position: 'relative', paddingTop: 18 }}>
            <div className="meter" style={{ height: 14 }}>
              <div className="meter__fill" style={{ width: `${m.actualProgress * 100}%`, background: 'var(--s3)' }} />
              <div className="meter__target" style={{ left: `${timePct * 100}%`, background: 'var(--accent-mark)', top: -18, bottom: -4 }} />
            </div>
            <span className="small" style={{ position: 'absolute', top: -2, left: `calc(${timePct * 100}% + 6px)`, color: 'var(--accent)', fontWeight: 600 }}>
              Today · {dayLabel(TODAY)}
            </span>
          </div>
          <div className="row small muted" style={{ justifyContent: 'space-between' }}>
            <span className="num">Start {dayLabel(contract.startDate)}</span>
            <span>Green bar = physical progress; orange mark = time elapsed.</span>
            <span className="num">Target {dayLabel(contract.targetCompletion)}</span>
          </div>
        </div>
      </Panel>

      <div className="grid grid--side-main">
        <Panel refNo="01-B" title="Project identification">
          <dl className="dl">
            <dt>Project</dt>
            <dd style={{ fontFamily: 'var(--font-sans)' }}>{contract.projectName}</dd>
            <dt>Location</dt>
            <dd style={{ fontFamily: 'var(--font-sans)' }}>{contract.location}</dd>
            <dt>Contract no.</dt>
            <dd>{contract.contractNo}</dd>
            <dt>Client</dt>
            <dd style={{ fontFamily: 'var(--font-sans)' }}>{contract.client}</dd>
            <dt>Start date</dt>
            <dd>{contract.startDate}</dd>
            <dt>Target completion</dt>
            <dd>{contract.targetCompletion}</dd>
            <dt>Duration</dt>
            <dd>{contract.durationMonths} months</dd>
          </dl>
        </Panel>

        <Panel refNo="01-C" title="Monitoring workflow" sub="Daily = Record → Weekly = Analyze → Monthly = Control & Forecast" flush>
          <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {FLOW.map((s, i) => (
              <li key={i} style={{ borderBottom: i < FLOW.length - 1 ? '1px solid var(--rule)' : 0 }}>
                <Link
                  to={s.to ?? '/'}
                  className="row"
                  style={{ textDecoration: 'none', padding: '8px 16px', gap: 12, flexWrap: 'nowrap', minHeight: 40 }}
                >
                  <span className="mono small muted" style={{ width: 24 }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span style={{ flex: 1 }}>{s.t}</span>
                  <span className="panel__ref">{s.k === '—' ? 'ACTION' : `SHEET ${s.k}`}</span>
                </Link>
              </li>
            ))}
          </ol>
        </Panel>
      </div>
    </>
  );
}

/* ============================ 02 CONTRACT & BOQ ============================ */

export function ContractBoq() {
  const boqTotal = boq.reduce((s, b) => s + b.boqQty * b.unitCost, 0);
  const earned = boq.reduce((s, b) => s + b.doneQty * b.unitCost, 0);
  return (
    <>
      <Readout cols={4}>
        <ReadoutCell label="Original contract" value={php(contract.originalAmount)} />
        <ReadoutCell label="Approved variation orders" value={`+${php(vo)}`} meta={`${contract.variationOrders.length} approved`} />
        <ReadoutCell label="Revised contract amount" value={php(REVISED_CONTRACT)} />
        <ReadoutCell label="BOQ accomplished" value={pct(earned / boqTotal)} meta={`${phpShort(earned)} of ${phpShort(boqTotal)} BOQ value`} />
      </Readout>

      <Panel refNo="02-A" title="Approved bill of quantities" sub="Amount = BOQ quantity × unit cost. Accomplished value = quantity done × unit cost." flush>
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Item</th>
                <th>Description</th>
                <th className="r">BOQ qty</th>
                <th>Unit</th>
                <th className="r">Unit cost</th>
                <th className="r">Amount</th>
                <th className="r">Qty done</th>
                <th style={{ minWidth: 150 }}>% complete</th>
              </tr>
            </thead>
            <tbody>
              {boq.map((b) => (
                <tr key={b.code}>
                  <td className="num">{b.code}</td>
                  <td>{b.description}</td>
                  <td className="r num">{qty(b.boqQty)}</td>
                  <td>{b.unit}</td>
                  <td className="r num">{php(b.unitCost)}</td>
                  <td className="r num">{php(b.boqQty * b.unitCost)}</td>
                  <td className="r num">{qty(b.doneQty)}</td>
                  <td>
                    <div className="row" style={{ gap: 8, flexWrap: 'nowrap' }}>
                      <div style={{ flex: 1 }}>
                        <div className="meter">
                          <div className="meter__fill" style={{ width: `${(b.doneQty / b.boqQty) * 100}%`, background: 'var(--s3)' }} />
                        </div>
                      </div>
                      <span className="num small">{pct(b.doneQty / b.boqQty, 0)}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={5}>BOQ total</td>
                <td className="r num">{php(boqTotal)}</td>
                <td />
                <td className="num small">{pct(earned / boqTotal)} by value</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Panel>

      <Panel refNo="02-B" title="Variation orders" flush>
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>VO no.</th>
                <th>Description</th>
                <th>Approved</th>
                <th className="r">Amount</th>
              </tr>
            </thead>
            <tbody>
              {contract.variationOrders.map((v) => (
                <tr key={v.id}>
                  <td className="num">{v.id}</td>
                  <td>{v.title}</td>
                  <td className="num">{v.approvedOn}</td>
                  <td className="r num">+{php(v.amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3}>Revised contract = {php(contract.originalAmount)} + {php(vo)}</td>
                <td className="r num">{php(REVISED_CONTRACT)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Panel>
    </>
  );
}

/* ============================ 03 BUDGET BASELINE ============================ */

export function BudgetBaseline() {
  return (
    <>
      <Readout cols={3}>
        <ReadoutCell label="Total approved project budget" value={php(TOTAL_BUDGET)} hero />
        <ReadoutCell label="Planned daily cost" value={php(DAILY_BUDGET_TOTAL)} meta="basis for daily variance" />
        <ReadoutCell label="Margin to revised contract" value={php(REVISED_CONTRACT - TOTAL_BUDGET)} meta={pct((REVISED_CONTRACT - TOTAL_BUDGET) / REVISED_CONTRACT)} />
      </Readout>

      <Panel refNo="03-A" title="Budget by cost category" sub="The baseline every daily, weekly and monthly figure is measured against" flush>
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Cost category</th>
                <th className="r">Approved budget</th>
                <th style={{ minWidth: 200 }}>Share of budget</th>
                <th className="r">Planned daily</th>
                <th className="r">Planned weekly</th>
              </tr>
            </thead>
            <tbody>
              {budget.map((b) => (
                <tr key={b.category}>
                  <td>
                    <span className="swatch" style={{ background: CATEGORY_VAR[b.category] }} />
                    {CATEGORY_LABEL[b.category]}
                  </td>
                  <td className="r num">{php(b.amount)}</td>
                  <td>
                    <div className="row" style={{ gap: 8, flexWrap: 'nowrap' }}>
                      <div style={{ flex: 1 }}>
                        <div className="meter">
                          <div className="meter__fill" style={{ width: `${(b.amount / MAX_LINE) * 100}%`, background: CATEGORY_VAR[b.category] }} />
                        </div>
                      </div>
                      <span className="num small" style={{ width: 44, textAlign: 'right' }}>
                        {pct(b.amount / TOTAL_BUDGET, 0)}
                      </span>
                    </div>
                  </td>
                  <td className="r num">{dailyBudget[b.category] ? php(dailyBudget[b.category]) : <span className="muted">lump sum</span>}</td>
                  <td className="r num">{dailyBudget[b.category] ? php(dailyBudget[b.category] * 7) : <span className="muted">—</span>}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td>Total approved project budget</td>
                <td className="r num">{php(TOTAL_BUDGET)}</td>
                <td className="num small">100%</td>
                <td className="r num">{php(DAILY_BUDGET_TOTAL)}</td>
                <td className="r num">{php(DAILY_BUDGET_TOTAL * 7)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Panel>

      <Panel refNo="03-B" title="Production baseline" sub="Planned quantities and unit costs for the key work items" flush>
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Activity</th>
                <th className="r">BOQ qty</th>
                <th className="r">Target qty</th>
                <th className="r">Unit cost</th>
                <th className="r">Planned / week</th>
                <th className="r">Planned / month</th>
              </tr>
            </thead>
            <tbody>
              {production.map((p) => (
                <tr key={p.activity}>
                  <td>{p.activity}</td>
                  <td className="r num">
                    {qty(p.boqQty)} {p.unit}
                  </td>
                  <td className="r num">
                    {qty(p.targetQty)} {p.unit}
                  </td>
                  <td className="r num">
                    {php(p.unitCost)}/{p.unit}
                  </td>
                  <td className="r num">
                    {qty(p.plannedWeekly)} {p.unit}
                  </td>
                  <td className="r num">
                    {qty(p.plannedMonthly)} {p.unit}
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
