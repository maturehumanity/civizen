import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PublicCiviWidget } from '@/components/public/PublicCiviWidget';
import { CIVI_AVATAR_STORAGE_KEY, setCiviAvatarId } from '@/lib/civi-avatar';
import { baseTranslations, translateMessage } from '@/lib/i18n';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, vars?: Record<string, string | number>) => translateMessage(baseTranslations, key, vars),
    language: 'en',
  }),
}));

vi.mock('@/lib/civi-public', async () => {
  const actual = await vi.importActual<typeof import('@/lib/civi-public')>('@/lib/civi-public');
  return {
    ...actual,
    askCiviPublic: vi.fn(async () => 'Civizen is an open participatory system.'),
  };
});

describe('PublicCiviWidget', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.localStorage.removeItem(CIVI_AVATAR_STORAGE_KEY);
    setCiviAvatarId('c');
  });

  it('opens a public Civi chat without requiring sign-in', async () => {
    render(
      <MemoryRouter>
        <PublicCiviWidget />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByTestId('public-civi-open'));
    expect(screen.getByTestId('public-civi-panel')).toBeInTheDocument();
    expect(screen.getByText('Civi. Your')).toBeInTheDocument();
    expect(screen.getByText('AI')).toBeInTheDocument();
    expect(screen.getByText('Assistant')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Ask about Civizen'), {
      target: { value: 'What is Civizen?' },
    });
    fireEvent.click(screen.getByLabelText('Send'));

    expect(await screen.findByText('Civizen is an open participatory system.')).toBeInTheDocument();
  });
});
