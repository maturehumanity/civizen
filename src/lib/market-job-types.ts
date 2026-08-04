/** Curated employment job-type seeds for Market Jobs sentence form (not certified professions). */
export const MARKET_JOB_TYPE_SEEDS = [
  'Baker',
  'Cashier',
  'Cook',
  'Driver',
  'Electrician',
  'Gardener',
  'Housekeeper',
  'Mechanic',
  'Nurse',
  'Painter',
  'Plumber',
  'Receptionist',
  'Sales associate',
  'Security guard',
  'Teacher',
  'Waiter',
  'Warehouse worker',
  'Cleaner',
  'Carpenter',
  'Delivery courier',
  'Caregiver',
  'Barista',
  'Construction worker',
  'IT support',
  'Office assistant',
] as const;

export const MARKET_JOB_PAY_PERIODS = [
  'Hourly pay',
  'Daily pay',
  'Weekly pay',
  'Monthly pay',
  'Yearly pay',
] as const;

export const MARKET_JOB_DAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

export const MARKET_JOB_TERMS = [
  'Full-time',
  'Part-time',
  'Permanent',
  'Contract',
  'Temporary',
] as const;

export type MarketJobMode = 'seeker' | 'employer';

export function filterMarketJobTypeOptions(query: string, selected: readonly string[] = []): string[] {
  const needle = query.trim().toLowerCase();
  const selectedSet = new Set(selected.map((item) => item.toLowerCase()));
  const seeds = [...MARKET_JOB_TYPE_SEEDS];
  const customSelected = selected.filter(
    (item) => !MARKET_JOB_TYPE_SEEDS.some((seed) => seed.toLowerCase() === item.toLowerCase()),
  );
  const pool = [...customSelected, ...seeds];
  const filtered = needle
    ? pool.filter((seed) => seed.toLowerCase().includes(needle))
    : pool;
  // Selected items first, then the rest alphabetically.
  return filtered.sort((left, right) => {
    const leftSelected = selectedSet.has(left.toLowerCase()) ? 0 : 1;
    const rightSelected = selectedSet.has(right.toLowerCase()) ? 0 : 1;
    if (leftSelected !== rightSelected) return leftSelected - rightSelected;
    return left.localeCompare(right);
  });
}

/** English list join with "or": "A", "A or B", "A, B or C". */
export function formatEnglishOrList(items: string[]): string {
  const cleaned = items.map((item) => item.trim()).filter(Boolean);
  if (cleaned.length === 0) return '';
  if (cleaned.length === 1) return cleaned[0];
  if (cleaned.length === 2) return `${cleaned[0]} or ${cleaned[1]}`;
  return `${cleaned.slice(0, -1).join(', ')} or ${cleaned[cleaned.length - 1]}`;
}

export function ageFromDateOfBirth(dateOfBirth: string | null | undefined, now = new Date()): string {
  if (!dateOfBirth) return '';
  const born = new Date(dateOfBirth);
  if (Number.isNaN(born.getTime())) return '';
  let age = now.getFullYear() - born.getFullYear();
  const monthDelta = now.getMonth() - born.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < born.getDate())) {
    age -= 1;
  }
  if (age < 0 || age > 120) return '';
  return String(age);
}
