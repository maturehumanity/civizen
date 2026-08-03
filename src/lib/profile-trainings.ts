import { formatEnglishList } from '@/lib/profile-skills';

/** Common training / course seeds for the Learning trainings sentence. */
export const PROFILE_TRAINING_SEEDS = [
  'Leadership development',
  'Project management',
  'Public speaking',
  'Conflict resolution',
  'Civic facilitation',
  'First aid / CPR',
  'Workplace safety',
  'Data analysis',
  'Software development',
  'Product management',
  'Human resources',
  'Financial literacy',
  'Entrepreneurship',
  'Teaching methods',
  'Research methods',
  'Negotiation',
  'Customer service',
  'Digital marketing',
  'Cybersecurity awareness',
  'AI literacy',
  'Community organizing',
  'Grant writing',
  'Mediation',
  'Inclusive leadership',
] as const;

export function normalizeTrainingNames(names: unknown): string[] {
  if (!Array.isArray(names)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of names) {
    if (typeof item !== 'string') continue;
    const trimmed = item.trim().replace(/\s+/g, ' ');
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }
  return result;
}

export function filterTrainingOptions(
  query: string,
  selected: string[],
  seeds: readonly string[] = PROFILE_TRAINING_SEEDS,
): string[] {
  const q = query.trim().toLowerCase();
  const selectedKeys = new Set(selected.map((name) => name.toLowerCase()));
  const fromSeeds = seeds.filter((name) => {
    if (selectedKeys.has(name.toLowerCase())) return true;
    if (!q) return true;
    return name.toLowerCase().includes(q);
  });
  const customSelected = selected.filter(
    (name) => !seeds.some((seed) => seed.toLowerCase() === name.toLowerCase()),
  );
  const merged = [...customSelected, ...fromSeeds];
  if (!q) return merged;
  return merged.filter((name) => name.toLowerCase().includes(q));
}

export function isKnownTraining(name: string, seeds: readonly string[] = PROFILE_TRAINING_SEEDS): boolean {
  const key = name.trim().toLowerCase();
  if (!key) return false;
  return seeds.some((seed) => seed.toLowerCase() === key);
}

export function formatTrainingList(names: string[]): string {
  return formatEnglishList(normalizeTrainingNames(names));
}

export function countTrainingsFromEntry(entry: { training_names?: unknown } | null | undefined): number {
  return normalizeTrainingNames(entry?.training_names).length;
}
