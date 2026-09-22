import type { CostCategory } from './types';

export const CATEGORY_LABEL: Record<CostCategory, string> = {
  equipment: 'Equipment rental',
  fuel: 'Fuel',
  labor: 'Labor',
  materials: 'Materials',
  maintenance: 'Maintenance',
  other: 'Other costs',
};

export const CATEGORY_SHORT: Record<CostCategory, string> = {
  equipment: 'Equip.',
  fuel: 'Fuel',
  labor: 'Labor',
  materials: 'Mat.',
  maintenance: 'Maint.',
  other: 'Other',
};

/** Fixed categorical order — colour follows the category, never its rank. */
export const CATEGORY_VAR: Record<CostCategory, string> = {
  equipment: 'var(--s1)',
  fuel: 'var(--s2)',
  labor: 'var(--s3)',
  materials: 'var(--s4)',
  maintenance: 'var(--s5)',
  other: 'var(--s-other)',
};
