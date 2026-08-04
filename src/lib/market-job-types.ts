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

export function filterMarketJobTypeOptions(query: string, selected: readonly string[]): string[] {
  const needle = query.trim().toLowerCase();
  const selectedSet = new Set(selected.map((item) => item.toLowerCase()));
  const seeds = MARKET_JOB_TYPE_SEEDS.filter((seed) => !selectedSet.has(seed.toLowerCase()));
  if (!needle) return [...seeds];
  return seeds.filter((seed) => seed.toLowerCase().includes(needle));
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
