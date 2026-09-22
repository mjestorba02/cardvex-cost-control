export type SheetGroup = 'control-room' | 'baseline' | 'record' | 'analyze' | 'control';

export interface Sheet {
  no: string;
  path: string;
  title: string;
  nav: string;
  group: SheetGroup;
  description: string;
}

export const GROUPS: { id: SheetGroup; label: string; cadence: string }[] = [
  { id: 'control-room', label: 'Control room', cadence: 'live' },
  { id: 'baseline', label: 'A · Baseline', cadence: 'once' },
  { id: 'record', label: 'B · Record', cadence: 'daily' },
  { id: 'analyze', label: 'C · Analyze', cadence: 'weekly' },
  { id: 'control', label: 'D · Control', cadence: 'monthly' },
];

export const SHEETS: Sheet[] = [
  { no: '16', path: '/', nav: 'Dashboard', title: 'Cost Control Dashboard', group: 'control-room', description: 'Cost, progress and forecast at a glance — where the project stands today and where it is heading.' },

  { no: '01', path: '/project', nav: 'Project summary', title: 'Project Summary', group: 'baseline', description: 'Contract status, time elapsed and the monitoring workflow for this project.' },
  { no: '02', path: '/contract', nav: 'Contract & BOQ', title: 'Contract & Bill of Quantities', group: 'baseline', description: 'Original contract, approved variation orders and the BOQ items that define scope.' },
  { no: '03', path: '/budget', nav: 'Budget baseline', title: 'Budget / Cost Baseline', group: 'baseline', description: 'Approved budget by cost category, the daily planned cost and the production baseline.' },

  { no: '04', path: '/daily/equipment', nav: 'Equipment', title: 'Daily Equipment Rental', group: 'record', description: 'Every unit on site: rental rate, operating, standby and idle hours.' },
  { no: '05', path: '/daily/fuel', nav: 'Fuel', title: 'Daily Fuel Consumption', group: 'record', description: 'Liters issued per unit against hour meter readings and diesel price.' },
  { no: '06', path: '/daily/labor', nav: 'Labor', title: 'Daily Labor Cost', group: 'record', description: 'Manpower attendance, daily rates, overtime and allowances.' },
  { no: '07', path: '/daily/materials', nav: 'Materials', title: 'Daily Materials', group: 'record', description: 'Deliveries received, quantities consumed, wastage and unit price changes.' },
  { no: '08', path: '/daily/maintenance', nav: 'Maintenance', title: 'Daily Maintenance', group: 'record', description: 'Preventive and corrective repairs, parts, tires and lubricants.' },
  { no: '09', path: '/daily/summary', nav: 'Daily cost summary', title: 'Daily Cost Consolidation', group: 'record', description: 'End-of-day roll-up of all five records, compared against the daily planned cost.' },

  { no: '10', path: '/weekly', nav: 'Weekly monitoring', title: 'Weekly Cost Monitoring', group: 'analyze', description: 'Seven daily records consolidated into budget vs. actual by category.' },
  { no: '12', path: '/accomplishment', nav: 'Accomplishment', title: 'Accomplishment', group: 'analyze', description: 'Daily and weekly physical output for every work item, planned vs. actual, valued at BOQ rates.' },
  { no: '14', path: '/variance', nav: 'Variance analysis', title: 'Variance Analysis', group: 'analyze', description: 'Why each significant variance happened, and what is being done about it.' },

  { no: '11', path: '/monthly', nav: 'Monthly monitoring', title: 'Monthly Cost Report', group: 'control', description: 'Contract status and cost summary by category: previous, current month, cumulative, remaining.' },
  { no: '13', path: '/cost-vs-accomplishment', nav: 'Cost vs. accomplishment', title: 'Cost vs. Accomplishment', group: 'control', description: 'Is the project spending faster or slower than it is building?' },
  { no: '15', path: '/forecast', nav: 'Forecast to complete', title: 'Forecast / Cost to Complete', group: 'control', description: 'Estimate the cost to complete and flag overruns before they happen.' },
];

export const sheetByPath = (path: string) => SHEETS.find((s) => s.path === path) ?? SHEETS[0];
