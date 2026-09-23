import { useState } from 'react';
import { Pencil, RotateCcw } from 'lucide-react';
import { CATEGORY_LABEL, CATEGORY_VAR } from '@/data/labels';
import { CATEGORIES, type CostCategory } from '@/data/types';
import { pct, php, phpShort } from '@/lib/format';
import { BUDGET_BY_CAT, TOTAL_BUDGET, useMetrics } from '@/lib/metrics';
import { useProject } from '@/store/ProjectStore';
import { Panel } from '@/components/ui/Panel';
import { Readout, ReadoutCell } from '@/components/ui/Readout';
import { Delta, VarianceTag } from '@/components/ui/Status';
import { FormModal, num } from '@/components/forms/FormModal';

export function Forecast() {
  const m = useMetrics();
  const { etc, setEtc } = useProject();
  const [editing, setEditing] = useState<CostCategory | null>(null);
  const overrides = Object.keys(etc).length;

  // Alternative methods for comparison
  const eacBudgetRate = m.costToDate + (TOTAL_BUDGET - m.earned); // remaining work at budget rates
  const eacCpi = TOTAL_BUDGET / m.cpi; // remaining work at current efficiency

  return (
    <>
      <Readout cols={4}>
        <ReadoutCell label="Actual cost to date" value={phpShort(m.costToDate)} title={php(m.costToDate)} meta={`${pct(m.actualProgress)} complete`} />
        <ReadoutCell label="Estimated cost to complete" value={phpShort(m.etcTotal)} title={php(m.etcTotal)} meta={overrides ? `${overrides} engineer overrides` : 'performance method'} />
        <ReadoutCell label="Forecast final cost" value={phpShort(m.forecastFinal)} title={php(m.forecastFinal)} hero />
        <ReadoutCell
          label="Forecast variance"
          value={phpShort(m.forecastVariance)}
          title={php(m.forecastVariance)}
          hero
          meta={<VarianceTag pct={-m.forecastVariance / TOTAL_BUDGET} />}
        />
      </Readout>

      <div className="stack small">
        <div className="formula">
          <b>Forecast final cost</b> = actual to date + estimated cost to complete = {php(m.costToDate)} + {php(m.etcTotal)} = <b>{php(m.forecastFinal)}</b>
        </div>
        <div className="formula">
          <b>Forecast variance</b> = approved budget − forecast final cost = {php(TOTAL_BUDGET)} − {php(m.forecastFinal)} = <b>{php(m.forecastVariance)}</b>
        </div>
      </div>

      <Panel
        refNo="15-A"
        title="Cost to complete by category"
        sub="Default ETC assumes each category keeps its current cost-per-progress rate. Overwrite any figure with your own estimate."
        flush
        actions={
          overrides > 0 && (
            <button className="btn btn--sm" onClick={() => CATEGORIES.forEach((c) => setEtc(c, null))}>
              <RotateCcw /> Clear overrides
            </button>
          )
        }
      >
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Cost category</th>
                <th className="r">Approved budget</th>
                <th className="r">Actual to date</th>
                <th className="r" style={{ minWidth: 170 }}>
                  Est. cost to complete
                </th>
                <th className="r">Forecast final</th>
                <th className="r">Forecast variance</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {CATEGORIES.map((c) => {
                const final = m.actualByCat[c] + m.etcUsed[c];
                const fv = BUDGET_BY_CAT[c] - final;
                const overridden = etc[c] !== undefined;
                return (
                  <tr key={c}>
                    <td>
                      <span className="swatch" style={{ background: CATEGORY_VAR[c] }} />
                      {CATEGORY_LABEL[c]}
                    </td>
                    <td className="r num">{php(BUDGET_BY_CAT[c])}</td>
                    <td className="r num">{php(m.actualByCat[c])}</td>
                    <td className="r">
                      <div className="row" style={{ gap: 6, justifyContent: 'flex-end', flexWrap: 'nowrap' }}>
                        <span className="num">{php(m.etcUsed[c])}</span>
                        {overridden && (
                          <span className="tag tag--watch" title={`Calculated estimate is ${php(m.etcDefault[c])}`}>
                            Overridden
                          </span>
                        )}
                        <button
                          className="btn btn--icon btn--sm"
                          onClick={() => setEditing(c)}
                          aria-label={`Adjust estimated cost to complete for ${CATEGORY_LABEL[c]}`}
                          title="Adjust estimate"
                        >
                          <Pencil />
                        </button>
                      </div>
                    </td>
                    <td className="r num">{php(final)}</td>
                    <td className="r">
                      <Delta amount={-fv} pct={-fv / BUDGET_BY_CAT[c]} />
                    </td>
                    <td>
                      <VarianceTag pct={-fv / BUDGET_BY_CAT[c]} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td>Total</td>
                <td className="r num">{php(TOTAL_BUDGET)}</td>
                <td className="r num">{php(m.costToDate)}</td>
                <td className="r num">{php(m.etcTotal)}</td>
                <td className="r num">{php(m.forecastFinal)}</td>
                <td className="r">
                  <Delta amount={-m.forecastVariance} pct={-m.forecastVariance / TOTAL_BUDGET} />
                </td>
                <td>
                  <VarianceTag pct={-m.forecastVariance / TOTAL_BUDGET} />
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
        <div className="panel__foot">Forecast variance shown as overrun (+) / saving (−) against each category budget.</div>
      </Panel>

      <Panel refNo="15-B" title="Cross-check: forecast methods" sub="Different assumptions about how the remaining work will perform" flush>
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Method</th>
                <th>Assumption</th>
                <th className="r">Forecast final</th>
                <th className="r">vs budget</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Budget rate</td>
                <td className="small">Remaining work is done at the originally budgeted rates. Best case.</td>
                <td className="r num">{php(eacBudgetRate)}</td>
                <td className="r">
                  <Delta amount={eacBudgetRate - TOTAL_BUDGET} pct={(eacBudgetRate - TOTAL_BUDGET) / TOTAL_BUDGET} />
                </td>
              </tr>
              <tr>
                <td>Current efficiency (CPI {m.cpi.toFixed(2)})</td>
                <td className="small">Remaining work costs what completed work has cost so far.</td>
                <td className="r num">{php(eacCpi)}</td>
                <td className="r">
                  <Delta amount={eacCpi - TOTAL_BUDGET} pct={(eacCpi - TOTAL_BUDGET) / TOTAL_BUDGET} />
                </td>
              </tr>
              <tr style={{ background: 'var(--accent-wash)' }}>
                <td>
                  <strong>Cost engineer's estimate</strong>
                </td>
                <td className="small">Category-by-category estimate above — the figure reported.</td>
                <td className="r num">
                  <strong>{php(m.forecastFinal)}</strong>
                </td>
                <td className="r">
                  <Delta amount={-m.forecastVariance} pct={-m.forecastVariance / TOTAL_BUDGET} />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Panel>

      {editing && (
        <FormModal
          title={`Cost to complete — ${CATEGORY_LABEL[editing]}`}
          sub={`Budget ${php(BUDGET_BY_CAT[editing])} · spent ${php(m.actualByCat[editing])} to date`}
          fields={[
            {
              name: 'etc',
              label: 'Estimated cost to complete ₱',
              kind: 'number',
              step: 10000,
              full: true,
              hint: `Performance method calculates ${php(m.etcDefault[editing])} — override it with the site's own estimate.`,
            },
          ]}
          initial={{ etc: String(Math.round(m.etcUsed[editing])) }}
          computed={(v) => {
            const final = m.actualByCat[editing] + num(v.etc);
            const fv = BUDGET_BY_CAT[editing] - final;
            if (!Number.isFinite(final)) return <span className="num">—</span>;
            return (
              <span className="num">
                {php(final)} <span className="muted">forecast final ·</span> <Delta amount={-fv} pct={-fv / BUDGET_BY_CAT[editing]} />
              </span>
            );
          }}
          computedLabel="Forecast final · actual + estimate"
          submitLabel="Save estimate"
          onSubmit={(v) => setEtc(editing, Math.max(0, num(v.etc)))}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}
