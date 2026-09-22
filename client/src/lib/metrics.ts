import { useMemo } from 'react';
import { budget, contract, dailyBudget, months, TODAY, WEEK_DATES, weeklyHistory, CURRENT_WEEK } from '@/data/seed';
import { CATEGORIES, type CostCategory, type MonthRecord } from '@/data/types';
import { useProject } from '@/store/ProjectStore';
import { monthsBetween } from './format';
import {
  accomplishmentFor,
  addTotals,
  alignment,
  emptyTotals,
  scaleTotals,
  sumTotals,
  totalsForDates,
  type CategoryTotals,
} from './calc';

export const BUDGET_BY_CAT: CategoryTotals = (() => {
  const t = emptyTotals();
  budget.forEach((b) => (t[b.category] = b.amount));
  return t;
})();
export const TOTAL_BUDGET = sumTotals(BUDGET_BY_CAT);
export const REVISED_CONTRACT =
  contract.originalAmount + contract.variationOrders.reduce((s, v) => s + v.amount, 0);
export const DAILY_BUDGET_TOTAL = sumTotals(dailyBudget);

/** Everything derived from baseline + records, computed once per state change. */
export function useMetrics() {
  const { records, etc } = useProject();

  return useMemo(() => {
    const weekTotals = totalsForDates(records, WEEK_DATES);
    const weekBudget = scaleTotals(dailyBudget, WEEK_DATES.length);
    const weekActual = sumTotals(weekTotals);
    const weekBudgetTotal = sumTotals(weekBudget);
    const weekQty = accomplishmentFor(records, WEEK_DATES);

    const days = WEEK_DATES.map((date) => {
      const t = totalsForDates(records, [date]);
      const q = accomplishmentFor(records, [date]);
      const total = sumTotals(t);
      return { date, totals: t, total, budget: DAILY_BUDGET_TOTAL, planned: q.planned, actual: q.actual };
    });

    // Current month = Sept-to-date history + this week's daily records
    const monthsLive: MonthRecord[] = months.map((m) =>
      m.closed ? m : { ...m, actualByCategory: addTotals(m.actualByCategory, weekTotals) },
    );

    const actualByCat = addTotals(...monthsLive.map((m) => m.actualByCategory));
    const costToDate = sumTotals(actualByCat);
    const current = monthsLive[monthsLive.length - 1];
    const prev = monthsLive[monthsLive.length - 2];

    // Planned progress interpolated to today within the current month
    const dayOfMonth = Number(TODAY.slice(8, 10));
    const monthFrac = Math.min(1, dayOfMonth / 30);
    const plannedProgress = (prev.plannedProgress + (current.plannedProgress - prev.plannedProgress) * monthFrac) / 100;
    const plannedCostToDate = prev.plannedCost + (current.plannedCost - prev.plannedCost) * monthFrac;
    const actualProgress = current.actualProgress / 100;

    // Earned value
    const earned = TOTAL_BUDGET * actualProgress;
    const cpi = earned / costToDate;
    const spi = actualProgress / plannedProgress;

    // Forecast: per category, performance-based ETC unless the engineer overrides it
    const etcDefault = emptyTotals();
    const etcUsed = emptyTotals();
    CATEGORIES.forEach((c) => {
      const perf = (actualByCat[c] * (1 - actualProgress)) / actualProgress;
      etcDefault[c] = perf;
      etcUsed[c] = etc[c] ?? perf;
    });
    const etcTotal = sumTotals(etcUsed);
    const forecastFinal = costToDate + etcTotal;
    const forecastVariance = TOTAL_BUDGET - forecastFinal;

    const elapsed = monthsBetween(contract.startDate, TODAY);
    const weeks = [
      ...weeklyHistory,
      { week: CURRENT_WEEK, start: WEEK_DATES[0], budget: weekBudgetTotal, actual: weekActual, planned: weekQty.planned, done: weekQty.actual },
    ];

    return {
      weekTotals,
      weekBudget,
      weekActual,
      weekBudgetTotal,
      weekQty,
      weeks,
      days,
      monthsLive,
      actualByCat,
      costToDate,
      remainingBudget: TOTAL_BUDGET - costToDate,
      costPctUsed: costToDate / TOTAL_BUDGET,
      plannedProgress,
      actualProgress,
      plannedCostToDate,
      progressVariance: actualProgress - plannedProgress,
      costVariance: earned - costToDate, // negative = overrun (EV convention)
      earned,
      cpi,
      spi,
      alignment: alignment(costToDate / TOTAL_BUDGET, actualProgress),
      etcDefault,
      etcUsed,
      etcTotal,
      forecastFinal,
      forecastVariance,
      elapsedMonths: elapsed,
      remainingMonths: Math.max(0, contract.durationMonths - elapsed),
    };
  }, [records, etc]);
}

export type Metrics = ReturnType<typeof useMetrics>;
export const categoryBudget = (c: CostCategory) => BUDGET_BY_CAT[c];
