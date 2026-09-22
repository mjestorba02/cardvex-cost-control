const peso = new Intl.NumberFormat('en-PH', { maximumFractionDigits: 0 });
const num1 = new Intl.NumberFormat('en-PH', { maximumFractionDigits: 1 });

/** ₱1,234,567 */
export const php = (n: number) => `${n < 0 ? '−' : ''}₱${peso.format(Math.abs(Math.round(n)))}`;

/** Signed peso for variances: +₱30,000 / −₱5,000 */
export const phpSigned = (n: number) => (Math.round(n) === 0 ? '₱0' : `${n > 0 ? '+' : '−'}₱${peso.format(Math.abs(Math.round(n)))}`);

/** ₱1.23M / ₱850K */
export function phpShort(n: number, digits = 2) {
  const a = Math.abs(n);
  const s = n < 0 ? '−' : '';
  if (a >= 1e9) return `${s}₱${(a / 1e9).toFixed(digits)}B`;
  if (a >= 1e6) return `${s}₱${(a / 1e6).toFixed(digits)}M`;
  if (a >= 1e3) return `${s}₱${(a / 1e3).toFixed(a >= 1e5 ? 0 : 1)}K`;
  return `${s}₱${Math.round(a)}`;
}

export const qty = (n: number) => num1.format(n);

/** 0.071 → 7.1% */
export const pct = (n: number, digits = 1) => `${(n * 100).toFixed(digits)}%`;
export const pctSigned = (n: number, digits = 1) =>
  `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n * 100).toFixed(digits)}%`;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const parse = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
};

/** "Sep 22" */
export const dayLabel = (iso: string) => {
  const d = parse(iso);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
};
/** "Tue" */
export const dowLabel = (iso: string) => DOW[parse(iso).getDay()];
/** "Sep 2026" from "2026-09" */
export const monthLabel = (ym: string, long = false) => {
  const d = parse(`${ym}-01`);
  return long ? `${MONTHS[d.getMonth()]} ${d.getFullYear()}` : MONTHS[d.getMonth()];
};
export const fullDate = (iso: string) => {
  const d = parse(iso);
  return `${DOW[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
};

export const monthsBetween = (a: string, b: string) => {
  const x = parse(a);
  const y = parse(b);
  return (y.getFullYear() - x.getFullYear()) * 12 + (y.getMonth() - x.getMonth()) + (y.getDate() - x.getDate()) / 30.4;
};
