import type {
  CostCategory,
  DailyRecords,
  EquipmentEntry,
  FuelEntry,
  LaborEntry,
  MaintenanceEntry,
  MaterialEntry,
  MonthRecord,
} from '@/data/types';
import { CATEGORIES } from '@/data/types';

export type CategoryTotals = Record<CostCategory, number>;

export const emptyTotals = (): CategoryTotals => ({
  equipment: 0,
  fuel: 0,
  labor: 0,
  materials: 0,
  maintenance: 0,
  other: 0,
});

export const sumTotals = (t: CategoryTotals) => CATEGORIES.reduce((s, c) => s + t[c], 0);

/* ---------------- line costs ---------------- */

export const equipmentHours = (e: EquipmentEntry) => e.operatingHrs + e.standbyHrs + e.idleHrs;
export const equipmentCost = (e: EquipmentEntry) => e.count * e.ratePerHour * equipmentHours(e);
export const equipmentIdleCost = (e: EquipmentEntry) => e.count * e.ratePerHour * e.idleHrs;
export const utilization = (e: EquipmentEntry) => {
  const h = equipmentHours(e);
  return h === 0 ? 0 : e.operatingHrs / h;
};

export const fuelCost = (f: FuelEntry) => f.liters * f.pricePerLiter;
export const litersPerHour = (f: FuelEntry) => (f.hoursRun ? f.liters / f.hoursRun : 0);

/** Overtime paid at 125% of the hourly equivalent of an 8-hour day. */
export const laborOvertime = (l: LaborEntry) => l.headcount * l.overtimeHrs * (l.dailyRate / 8) * 1.25;
export const laborRegular = (l: LaborEntry) => l.headcount * l.dailyRate * l.days;
export const laborAllowance = (l: LaborEntry) => l.headcount * l.allowance;
export const laborCost = (l: LaborEntry) => laborRegular(l) + laborOvertime(l) + laborAllowance(l);

/** Materials are costed on delivery (received into site). */
export const materialCost = (m: MaterialEntry) => m.delivered * m.unitCost;
export const materialConsumedValue = (m: MaterialEntry) => m.consumed * m.unitCost;

export const maintenanceCost = (m: MaintenanceEntry) => m.parts + m.labor;

/* ---------------- aggregation ---------------- */

export function totalsForDates(r: DailyRecords, dates: string[]): CategoryTotals {
  const set = new Set(dates);
  const t = emptyTotals();
  r.equipment.forEach((e) => set.has(e.date) && (t.equipment += equipmentCost(e)));
  r.fuel.forEach((e) => set.has(e.date) && (t.fuel += fuelCost(e)));
  r.labor.forEach((e) => set.has(e.date) && (t.labor += laborCost(e)));
  r.materials.forEach((e) => set.has(e.date) && (t.materials += materialCost(e)));
  r.maintenance.forEach((e) => set.has(e.date) && (t.maintenance += maintenanceCost(e)));
  return t;
}

export const scaleTotals = (t: CategoryTotals, k: number): CategoryTotals => {
  const o = emptyTotals();
  CATEGORIES.forEach((c) => (o[c] = t[c] * k));
  return o;
};

export const addTotals = (...ts: CategoryTotals[]): CategoryTotals => {
  const o = emptyTotals();
  ts.forEach((t) => CATEGORIES.forEach((c) => (o[c] += t[c])));
  return o;
};

/** Planned vs actual quantity for one activity (defaults to excavation, the cost-per-unit driver). */
export function accomplishmentFor(r: DailyRecords, dates: string[], activity = 'Excavation') {
  const set = new Set(dates);
  return r.accomplishment
    .filter((a) => set.has(a.date) && a.activity === activity)
    .reduce((s, a) => ({ planned: s.planned + a.planned, actual: s.actual + a.actual }), { planned: 0, actual: 0 });
}

/* ---------------- variance ---------------- */

/** Positive variance = overrun (actual above budget), per the workflow definition. */
export const variance = (actual: number, budget: number) => actual - budget;
export const variancePct = (actual: number, budget: number) => (budget === 0 ? 0 : (actual - budget) / budget);

export type Severity = 'under' | 'ok' | 'watch' | 'over';

/** Thresholds a cost engineer would flag on. */
export function severity(pct: number): Severity {
  if (pct <= -0.02) return 'under';
  if (pct < 0.05) return 'ok';
  if (pct < 0.1) return 'watch';
  return 'over';
}

/* ---------------- monthly / cumulative ---------------- */

export function monthTotal(m: MonthRecord) {
  return sumTotals(m.actualByCategory);
}

export interface CumulativePoint {
  month: string;
  plannedProgress: number;
  actualProgress: number | null;
  plannedCost: number;
  actualCost: number | null;
}

export function cumulative(months: MonthRecord[]): CumulativePoint[] {
  let running = 0;
  return months.map((m) => {
    running += monthTotal(m);
    return {
      month: m.month,
      plannedProgress: m.plannedProgress,
      actualProgress: m.actualProgress,
      plannedCost: m.plannedCost,
      actualCost: running,
    };
  });
}

/**
 * Spending vs. progress signal.
 * Compare % of budget consumed against % of work physically accomplished.
 */
export type Alignment = 'faster' | 'aligned' | 'slower';
export function alignment(costPct: number, progressPct: number, tol = 0.01): Alignment {
  const d = costPct - progressPct;
  if (d > tol) return 'faster';
  if (d < -tol) return 'slower';
  return 'aligned';
}
