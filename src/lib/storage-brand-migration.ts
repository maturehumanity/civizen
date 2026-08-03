/**
 * One-time local preference migration for pre-Civizen storage key prefixes,
 * plus scrub of leftover "Levela" brand tokens inside cached values (e.g. i18n packs).
 */
const MIGRATION_FLAG = 'civizen-storage-brand-migrated-v2';

function mapKey(key: string): string | null {
  if (key.startsWith('civizen-') || key.startsWith('civizen:')) return null;
  if (key.startsWith('levela-')) return `civizen-${key.slice('levela-'.length)}`;
  if (key.startsWith('levela:')) return `civizen:${key.slice('levela:'.length)}`;
  return null;
}

function scrubLegacyBrandValue(value: string): string {
  if (!/levela/i.test(value)) return value;
  return value
    .replace(/did:levela:/gi, 'did:civizen:')
    .replace(/Levela/g, 'Civizen')
    .replace(/levela/g, 'civizen');
}

export function migrateLegacyBrandStorageKeys(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    if (window.localStorage.getItem(MIGRATION_FLAG) === '1') return;

    const keys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (key) keys.push(key);
    }

    for (const key of keys) {
      const nextKey = mapKey(key) ?? key;
      const value = window.localStorage.getItem(key);
      if (value == null) continue;

      const scrubbed = scrubLegacyBrandValue(value);
      const targetExists = nextKey !== key && window.localStorage.getItem(nextKey) != null;

      if (nextKey !== key && !targetExists) {
        window.localStorage.setItem(nextKey, scrubbed);
      } else if (scrubbed !== value && (nextKey === key || targetExists)) {
        window.localStorage.setItem(nextKey === key ? key : nextKey, scrubbed);
      } else if (nextKey === key && scrubbed !== value) {
        window.localStorage.setItem(key, scrubbed);
      }

      // Drop obsolete pre-rebrand keys after copy.
      if (nextKey !== key) {
        window.localStorage.removeItem(key);
      }
    }

    // Drop any leftover i18n packs that still embed Levela (any version prefix).
    for (let i = window.localStorage.length - 1; i >= 0; i -= 1) {
      const key = window.localStorage.key(i);
      if (!key) continue;
      if (!key.includes('i18n-pack')) continue;
      const value = window.localStorage.getItem(key);
      if (value && /levela/i.test(value)) {
        window.localStorage.removeItem(key);
      }
    }

    window.localStorage.setItem(MIGRATION_FLAG, '1');
  } catch {
    // Ignore quota / private-mode failures; app still runs with defaults.
  }
}
