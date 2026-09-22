import type {
  AccomplishmentEntry,
  BoqItem,
  BudgetLine,
  Contract,
  CostCategory,
  DailyRecords,
  EquipmentEntry,
  FuelEntry,
  LaborEntry,
  MaintenanceEntry,
  MaterialEntry,
  MonthRecord,
  ProductionBaseline,
} from './types';

/* ------------------------------------------------------------------ */
/*  Baseline                                                           */
/* ------------------------------------------------------------------ */

export const contract: Contract = {
  projectName: 'Land Development — Phase 1',
  location: 'Site A, Lot 4–12',
  contractNo: 'CV-LD-2026-014',
  client: 'CARDVEX',
  originalAmount: 112_000_000,
  variationOrders: [
    { id: 'VO-01', title: 'Additional drainage line, Road 3', approvedOn: '2026-05-18', amount: 2_650_000 },
    { id: 'VO-02', title: 'Slope protection at north boundary', approvedOn: '2026-08-04', amount: 1_550_000 },
  ],
  startDate: '2026-03-02',
  targetCompletion: '2026-12-31',
  durationMonths: 10,
};

export const budget: BudgetLine[] = [
  { category: 'equipment', amount: 32_000_000 },
  { category: 'fuel', amount: 14_000_000 },
  { category: 'labor', amount: 12_000_000 },
  { category: 'materials', amount: 30_000_000 },
  { category: 'maintenance', amount: 6_000_000 },
  { category: 'other', amount: 6_000_000 },
];

/** Planned (budgeted) cost for one working day, per category. */
export const dailyBudget: Record<CostCategory, number> = {
  equipment: 110_300,
  fuel: 34_300,
  labor: 23_500,
  materials: 98_250,
  maintenance: 5_950,
  other: 0,
};

export const boq: BoqItem[] = [
  { code: '100', description: 'Clearing and grubbing', unit: 'ha', boqQty: 18, unitCost: 145_000, doneQty: 18 },
  { code: '102', description: 'Unsuitable excavation', unit: 'm³', boqQty: 62_000, unitCost: 285, doneQty: 36_900 },
  { code: '103', description: 'Structure excavation', unit: 'm³', boqQty: 9_500, unitCost: 420, doneQty: 4_300 },
  { code: '104', description: 'Embankment from borrow', unit: 'm³', boqQty: 71_000, unitCost: 390, doneQty: 38_200 },
  { code: '200', description: 'Aggregate subbase course', unit: 'm³', boqQty: 14_800, unitCost: 1_480, doneQty: 5_900 },
  { code: '311', description: 'PCC pavement, 0.23 m', unit: 'm²', boqQty: 21_500, unitCost: 1_650, doneQty: 4_100 },
  { code: '500', description: 'RCP drainage, 910 mm Ø', unit: 'lm', boqQty: 2_350, unitCost: 6_900, doneQty: 1_280 },
];

export const production: ProductionBaseline[] = [
  { activity: 'Excavation', unit: 'm³', boqQty: 71_500, targetQty: 71_500, unitCost: 300, plannedWeekly: 5_000, plannedMonthly: 21_500 },
  { activity: 'Embankment / fill', unit: 'm³', boqQty: 71_000, targetQty: 71_000, unitCost: 390, plannedWeekly: 4_600, plannedMonthly: 19_800 },
  { activity: 'Subbase', unit: 'm³', boqQty: 14_800, targetQty: 14_800, unitCost: 1_480, plannedWeekly: 900, plannedMonthly: 3_900 },
  { activity: 'PCC pavement', unit: 'm²', boqQty: 21_500, targetQty: 21_500, unitCost: 1_650, plannedWeekly: 1_400, plannedMonthly: 6_000 },
];

/* ------------------------------------------------------------------ */
/*  Monthly history (cumulative planned, per-month actuals)            */
/* ------------------------------------------------------------------ */

const split = (total: number): Record<CostCategory, number> => {
  const w: Record<CostCategory, number> = {
    equipment: 0.318,
    fuel: 0.146,
    labor: 0.118,
    materials: 0.302,
    maintenance: 0.066,
    other: 0.05,
  };
  const out = {} as Record<CostCategory, number>;
  (Object.keys(w) as CostCategory[]).forEach((k) => (out[k] = Math.round(total * w[k])));
  return out;
};

export const months: MonthRecord[] = [
  { month: '2026-03', plannedProgress: 5, actualProgress: 4.6, plannedCost: 5_000_000, actualByCategory: split(5_350_000), closed: true },
  { month: '2026-04', plannedProgress: 13, actualProgress: 12.1, plannedCost: 13_000_000, actualByCategory: split(8_420_000), closed: true },
  { month: '2026-05', plannedProgress: 23, actualProgress: 21.4, plannedCost: 22_500_000, actualByCategory: split(9_660_000), closed: true },
  { month: '2026-06', plannedProgress: 33, actualProgress: 30.9, plannedCost: 32_500_000, actualByCategory: split(10_380_000), closed: true },
  { month: '2026-07', plannedProgress: 43, actualProgress: 40.2, plannedCost: 42_500_000, actualByCategory: split(9_600_000), closed: true },
  { month: '2026-08', plannedProgress: 52, actualProgress: 48.6, plannedCost: 51_500_000, actualByCategory: split(7_900_000), closed: true },
  // September to date (Sept 1–15). The current week's daily records are added on top.
  { month: '2026-09', plannedProgress: 60, actualProgress: 54.8, plannedCost: 59_500_000, actualByCategory: split(4_150_000), closed: false },
];

/** Planned cumulative % for remaining months — used to extend the S-curve. */
export const plannedRemaining = [
  { month: '2026-10', plannedProgress: 72, plannedCost: 71_000_000 },
  { month: '2026-11', plannedProgress: 86, plannedCost: 85_500_000 },
  { month: '2026-12', plannedProgress: 100, plannedCost: 100_000_000 },
];

/** Weekly history before the current week: [label, budget, actual, plannedQty, actualQty] */
export const weeklyHistory: { week: string; start: string; budget: number; actual: number; planned: number; done: number }[] = [
  { week: 'W22', start: '2026-07-29', budget: 1_906_000, actual: 1_958_000, planned: 5_000, done: 4_760 },
  { week: 'W23', start: '2026-08-05', budget: 1_906_000, actual: 1_921_000, planned: 5_000, done: 4_890 },
  { week: 'W24', start: '2026-08-12', budget: 1_906_000, actual: 2_064_000, planned: 5_000, done: 4_620 },
  { week: 'W25', start: '2026-08-19', budget: 1_906_000, actual: 1_987_000, planned: 5_000, done: 4_710 },
  { week: 'W26', start: '2026-08-26', budget: 1_906_000, actual: 1_932_000, planned: 5_000, done: 4_850 },
  { week: 'W27', start: '2026-09-02', budget: 1_906_000, actual: 2_011_000, planned: 5_000, done: 4_580 },
  { week: 'W28', start: '2026-09-09', budget: 1_906_000, actual: 2_059_000, planned: 5_000, done: 4_540 },
];

/* ------------------------------------------------------------------ */
/*  Current week — daily site records, Sept 16–22                      */
/* ------------------------------------------------------------------ */

export const WEEK_DATES = [
  '2026-09-16',
  '2026-09-17',
  '2026-09-18',
  '2026-09-19',
  '2026-09-20',
  '2026-09-21',
  '2026-09-22',
];
export const CURRENT_WEEK = 'W29';
export const TODAY = '2026-09-22';

/** Deterministic day-to-day wobble so the seed looks like real site data. */
const wob = (i: number, k: number, amp = 0.08) => 1 + amp * Math.sin(i * 1.7 + k * 2.3);
const r1 = (n: number) => Math.round(n * 2) / 2;
let seq = 0;
const id = (p: string) => `${p}-${(++seq).toString(36)}`;

const fleet = [
  { unit: 'EX-01 Excavator PC200', count: 1, rate: 2_500, lph: 15 },
  { unit: 'DT-01·03 Dump truck 10W', count: 3, rate: 1_800, lph: 9.5 },
  { unit: 'BD-01 Bulldozer D6', count: 1, rate: 3_200, lph: 21 },
  { unit: 'RR-01 Vibratory roller', count: 1, rate: 1_500, lph: 8 },
];

function buildEquipment(): EquipmentEntry[] {
  return WEEK_DATES.flatMap((date, i) =>
    fleet.map((f, k) => {
      const op = r1(7.5 * wob(i, k, 0.1));
      return {
        id: id('eq'),
        date,
        unit: f.unit,
        count: f.count,
        ratePerHour: f.rate,
        operatingHrs: op,
        standbyHrs: r1(Math.max(0, 1 * wob(i, k + 3, 0.6))),
        idleHrs: r1(Math.max(0, 0.8 * wob(i, k + 5, 0.9))),
      };
    }),
  );
}

function buildFuel(eq: EquipmentEntry[]): FuelEntry[] {
  const meters: Record<string, number> = {};
  fleet.forEach((f, k) => (meters[f.unit] = [1_196, 811, 2_430, 1_604][k]));
  return eq.map((e, n) => {
    const f = fleet.find((x) => x.unit === e.unit)!;
    const hrs = e.operatingHrs + e.idleHrs * 0.5;
    meters[e.unit] += e.operatingHrs;
    return {
      id: id('fu'),
      date: e.date,
      unit: e.unit,
      hourMeter: Math.round(meters[e.unit]),
      liters: Math.round(f.lph * e.count * hrs * wob(n, 1, 0.06)),
      pricePerLiter: e.date >= '2026-09-19' ? 67 : 65,
      hoursRun: e.operatingHrs * e.count,
    };
  });
}

const crew = [
  { position: 'Equipment operator', headcount: 6, rate: 1_200 },
  { position: 'Truck driver', headcount: 3, rate: 1_000 },
  { position: 'Foreman', headcount: 1, rate: 1_500 },
  { position: 'Mason', headcount: 4, rate: 900 },
  { position: 'Helper', headcount: 8, rate: 700 },
];

function buildLabor(): LaborEntry[] {
  return WEEK_DATES.flatMap((date, i) =>
    crew.map((c, k) => ({
      id: id('lb'),
      date,
      position: c.position,
      headcount: Math.max(1, Math.round(c.headcount * wob(i, k, 0.12))),
      dailyRate: c.rate,
      days: 1,
      overtimeHrs: k < 2 && i % 3 === 0 ? 2 : 0,
      allowance: k === 2 ? 150 : 0,
    })),
  );
}

function buildMaterials(): MaterialEntry[] {
  const rows: MaterialEntry[] = [];
  WEEK_DATES.forEach((date, i) => {
    rows.push({
      id: id('mt'),
      date,
      material: 'Gravel (subbase)',
      unit: 'm³',
      delivered: i % 2 === 0 ? 60 : 40,
      consumed: Math.round(48 * wob(i, 2, 0.1)),
      unitCost: date >= '2026-09-20' ? 1_260 : 1_200,
      wastage: Math.round(2 * wob(i, 4, 0.5)),
    });
    rows.push({
      id: id('mt'),
      date,
      material: 'Portland cement',
      unit: 'bags',
      delivered: i % 3 === 0 ? 150 : 90,
      consumed: Math.round(100 * wob(i, 1, 0.12)),
      unitCost: 280,
      wastage: Math.round(3 * wob(i, 6, 0.6)),
    });
    if (i % 2 === 1) {
      rows.push({
        id: id('mt'),
        date,
        material: 'RCP 910 mm Ø',
        unit: 'pcs',
        delivered: 4,
        consumed: 3,
        unitCost: 6_200,
        wastage: 0,
      });
    }
  });
  return rows;
}

function buildMaintenance(): MaintenanceEntry[] {
  return [
    { id: id('mn'), date: '2026-09-16', unit: 'DT-01·03 Dump truck 10W', kind: 'Preventive', description: '250-hr PMS, oil & filters', parts: 6_800, labor: 1_500 },
    { id: id('mn'), date: '2026-09-17', unit: 'RR-01 Vibratory roller', kind: 'Lubricants', description: 'Grease & hydraulic top-up', parts: 2_400, labor: 0 },
    { id: id('mn'), date: '2026-09-18', unit: 'DT-01·03 Dump truck 10W', kind: 'Tires', description: 'Replace 2 rear tires', parts: 18_000, labor: 1_200 },
    { id: id('mn'), date: '2026-09-20', unit: 'BD-01 Bulldozer D6', kind: 'Corrective', description: 'Track tension adjustment', parts: 1_800, labor: 2_500 },
    { id: id('mn'), date: '2026-09-22', unit: 'EX-01 Excavator PC200', kind: 'Corrective', description: 'Hydraulic hose & seal repair', parts: 15_000, labor: 5_000 },
  ];
}

/** Excavation actuals are absolute m³; the others are actual ÷ planned ratios per day. */
const ACC_PROFILE: Record<string, number[]> = {
  Excavation: [640, 682, 598, 655, 611, 694, 620],
  'Embankment / fill': [0.94, 0.97, 0.88, 0.95, 0.91, 1.02, 0.93],
  Subbase: [0.86, 0.78, 0.9, 0.74, 0.82, 0.88, 0.8],
  'PCC pavement': [1.05, 0.98, 1.1, 1.02, 0.96, 1.08, 1.04],
};

function buildAccomplishment(): AccomplishmentEntry[] {
  return WEEK_DATES.flatMap((date, i) =>
    production.map((p) => {
      // Split the weekly plan into whole daily quantities that sum back to the week
      const base = Math.floor(p.plannedWeekly / 7);
      const planned = i === 6 ? p.plannedWeekly - base * 6 : base;
      const prof = ACC_PROFILE[p.activity];
      const actual = p.activity === 'Excavation' ? prof[i] : Math.round(planned * prof[i]);
      return { date, activity: p.activity, unit: p.unit, planned, actual };
    }),
  );
}

/** Weekly actual quantity per activity for W22–W28 (planned comes from the production baseline). */
export const weeklyQtyHistory: Record<string, number[]> = {
  Excavation: weeklyHistory.map((w) => w.done),
  'Embankment / fill': [4_380, 4_450, 4_290, 4_410, 4_520, 4_230, 4_180],
  Subbase: [760, 810, 720, 790, 830, 700, 690],
  'PCC pavement': [1_320, 1_450, 1_380, 1_410, 1_470, 1_360, 1_440],
};

/** BOQ items that roll up into each production activity (for cumulative progress). */
export const ACTIVITY_BOQ: Record<string, string[]> = {
  Excavation: ['102', '103'],
  'Embankment / fill': ['104'],
  Subbase: ['200'],
  'PCC pavement': ['311'],
};

export function buildSeedRecords(): DailyRecords {
  seq = 0;
  const equipment = buildEquipment();
  return {
    equipment,
    fuel: buildFuel(equipment),
    labor: buildLabor(),
    materials: buildMaterials(),
    maintenance: buildMaintenance(),
    accomplishment: buildAccomplishment(),
  };
}

export const CAUSE_LIBRARY: Record<CostCategory, string[]> = {
  equipment: [
    'Low equipment productivity',
    'Excessive standby / idle time',
    'Additional units mobilized',
    'Rental rate increase',
    'Extended working hours',
  ],
  fuel: [
    'Increased equipment utilization',
    'Longer hauling distance',
    'Excessive equipment idle time',
    'Increase in diesel price',
    'Poor equipment productivity',
  ],
  labor: ['Overtime hours', 'Additional manpower', 'Rate / allowance adjustment', 'Low crew productivity'],
  materials: ['Increased material quantity', 'Price escalation', 'Wastage', 'Additional works', 'Variation Order'],
  maintenance: [
    'Equipment breakdown',
    'Unexpected repairs',
    'High equipment utilization',
    'Preventive maintenance requirements',
  ],
  other: ['Unplanned site expense', 'Permits / fees', 'Mobilization'],
};
