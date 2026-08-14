import { useSyncExternalStore } from 'react';

export const CIVI_AVATAR_IDS = ['c', 'gather', 'companion'] as const;
export type CiviAvatarId = (typeof CIVI_AVATAR_IDS)[number];

export const DEFAULT_CIVI_AVATAR_ID: CiviAvatarId = 'c';
export const CIVI_AVATAR_STORAGE_KEY = 'civizen.civi-avatar';

export const CIVI_AVATAR_OPTIONS = [
  { id: 'c', label: 'Civic C', file: 'civi-option-c.svg' },
  { id: 'gather', label: 'Gather', file: 'civi-option-gather.svg' },
  { id: 'companion', label: 'Companion', file: 'civi-option-companion.svg' },
] as const;

const listeners = new Set<() => void>();

function isCiviAvatarId(value: string | null | undefined): value is CiviAvatarId {
  return value === 'c' || value === 'gather' || value === 'companion';
}

export function civiAvatarPublicUrl(file: string): string {
  return `${import.meta.env.BASE_URL}avatars/${file}`;
}

export function getCiviAvatarOption(id: CiviAvatarId = DEFAULT_CIVI_AVATAR_ID) {
  return CIVI_AVATAR_OPTIONS.find((option) => option.id === id) ?? CIVI_AVATAR_OPTIONS[0];
}

export function getCiviAvatarUrl(id: CiviAvatarId = getCiviAvatarId()): string {
  return civiAvatarPublicUrl(getCiviAvatarOption(id).file);
}

export function getCiviAvatarId(): CiviAvatarId {
  if (typeof window === 'undefined') return DEFAULT_CIVI_AVATAR_ID;
  try {
    const stored = window.localStorage.getItem(CIVI_AVATAR_STORAGE_KEY);
    if (isCiviAvatarId(stored)) return stored;
  } catch {
    // Ignore quota / private-mode failures and keep the default.
  }
  return DEFAULT_CIVI_AVATAR_ID;
}

function emitCiviAvatarChange() {
  listeners.forEach((listener) => listener());
}

export function setCiviAvatarId(id: CiviAvatarId) {
  const next = isCiviAvatarId(id) ? id : DEFAULT_CIVI_AVATAR_ID;
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(CIVI_AVATAR_STORAGE_KEY, next);
    }
  } catch {
    // Keep the in-memory notification even if persistence fails.
  }
  emitCiviAvatarChange();
}

export function subscribeCiviAvatar(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useCiviAvatarId(): CiviAvatarId {
  return useSyncExternalStore(subscribeCiviAvatar, getCiviAvatarId, () => DEFAULT_CIVI_AVATAR_ID);
}

export function useCiviAvatarUrl(): string {
  return getCiviAvatarUrl(useCiviAvatarId());
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === CIVI_AVATAR_STORAGE_KEY) emitCiviAvatarChange();
  });
}
