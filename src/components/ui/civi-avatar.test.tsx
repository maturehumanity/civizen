import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CiviAvatar } from '@/components/ui/civi-avatar';
import { CIVI_AVATAR_STORAGE_KEY, getCiviAvatarId, setCiviAvatarId } from '@/lib/civi-avatar';
import { baseTranslations, translateMessage } from '@/lib/i18n';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, vars?: Record<string, string | number>) => translateMessage(baseTranslations, key, vars),
    language: 'en',
  }),
}));

beforeEach(() => {
  window.matchMedia = ((query: string) =>
    ({
      matches: query.includes('hover: hover'),
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
      onchange: null,
    }) as MediaQueryList);
});

afterEach(() => {
  window.localStorage.removeItem(CIVI_AVATAR_STORAGE_KEY);
  setCiviAvatarId('c');
});

describe('CiviAvatar', () => {
  it('shows Civic C by default and only the other two options on hover', () => {
    render(<CiviAvatar />);

    const trigger = screen.getByTestId('civi-avatar');
    expect(trigger).toHaveAttribute('data-civi-avatar', 'c');

    fireEvent.mouseEnter(trigger);

    expect(screen.getByRole('option', { name: "Use Gather as Civi's avatar" })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: "Use Companion as Civi's avatar" })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: "Use Civic C as Civi's avatar" })).not.toBeInTheDocument();
  });

  it('switches the in-place avatar when an alternative is chosen', () => {
    render(<CiviAvatar />);

    fireEvent.mouseEnter(screen.getByTestId('civi-avatar'));
    act(() => {
      fireEvent.click(screen.getByRole('option', { name: "Use Gather as Civi's avatar" }));
    });

    expect(getCiviAvatarId()).toBe('gather');
    expect(screen.getByTestId('civi-avatar')).toHaveAttribute('data-civi-avatar', 'gather');
  });
});
