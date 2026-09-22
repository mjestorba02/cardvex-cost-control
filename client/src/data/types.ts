export type CostCategory = 'equipment' | 'fuel' | 'labor' | 'materials' | 'maintenance' | 'other';

export const CATEGORIES: CostCategory[] = ['equipment', 'fuel', 'labor', 'materials', 'maintenance', 'other'];

/** The five categories captured through daily site records. "Other" is baseline-only. */
export const DAILY_CATEGORIES: Exclude<CostCategory, 'other'>[] = [
  'equipment',
  'fuel',
  'labor',
  'materials',
  'maintenance',
];

export interface VariationOrder {
  id: string;
  title: string;
  approvedOn: string;
  amount: number;
}

export interface BoqItem {
  code: string;
  description: string;
  unit: string;
  boqQty: number;
  unitCost: number;
  /** Quantity accomplished to date */
  doneQty: number;
}

export interface Contract {
  projectName: string;
  location: string;
  contractNo: string;
  client: string;
  originalAmount: number;
  variationOrders: VariationOrder[];
  startDate: string;
  targetCompletion: string;
  durationMonths: number;
}

export interface BudgetLine {
  category: CostCategory;
  amount: number;
}

export interface ProductionBaseline {
  activity: string;
  unit: string;
  boqQty: number;
  targetQty: number;
  unitCost: number;
  plannedWeekly: number;
  plannedMonthly: number;
}

// ---------- Daily records ----------

export interface EquipmentEntry {
  id: string;
  date: string;
  unit: string;
  count: number;
  ratePerHour: number;
  operatingHrs: number;
  standbyHrs: number;
  idleHrs: number;
}

export interface FuelEntry {
  id: string;
  date: string;
  unit: string;
  hourMeter: number;
  liters: number;
  pricePerLiter: number;
  hoursRun: number;
}

export interface LaborEntry {
  id: string;
  date: string;
  position: string;
  headcount: number;
  dailyRate: number;
  days: number;
  overtimeHrs: number;
  allowance: number;
}

export interface MaterialEntry {
  id: string;
  date: string;
  material: string;
  unit: string;
  delivered: number;
  consumed: number;
  unitCost: number;
  wastage: number;
}

export type MaintenanceKind = 'Preventive' | 'Corrective' | 'Tires' | 'Lubricants' | 'Spare parts';

export interface MaintenanceEntry {
  id: string;
  date: string;
  unit: string;
  kind: MaintenanceKind;
  description: string;
  parts: number;
  labor: number;
}

export interface AccomplishmentEntry {
  date: string;
  activity: string;
  unit: string;
  planned: number;
  actual: number;
  remarks?: string;
}

export interface DailyRecords {
  equipment: EquipmentEntry[];
  fuel: FuelEntry[];
  labor: LaborEntry[];
  materials: MaterialEntry[];
  maintenance: MaintenanceEntry[];
  accomplishment: AccomplishmentEntry[];
}

// ---------- Periodic history ----------

export interface MonthRecord {
  month: string; // e.g. "2026-03"
  plannedProgress: number; // cumulative %
  actualProgress: number; // cumulative %
  plannedCost: number; // cumulative
  actualByCategory: Record<CostCategory, number>; // this month only
  closed: boolean;
}

export interface VarianceNote {
  category: CostCategory;
  causes: string[];
  action: string;
  owner: string;
}
