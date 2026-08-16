import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { panelSizeAfterNwDrag, PublicCiviWidget } from '@/components/public/PublicCiviWidget';
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
    window.localStorage.removeItem('civizen.public-civi-size');
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

  it('enlarges the panel when the upper-left corner is dragged left and up', () => {
    const next = panelSizeAfterNwDrag({ width: 352, height: 448 }, 400, 400, 280, 280);
    expect(next.width).toBeGreaterThan(352);
    expect(next.height).toBeGreaterThan(448);
  });

  it('lets visitors resize from the upper-left corner and hides the message scrollbar', () => {
    render(
      <MemoryRouter>
        <PublicCiviWidget />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByTestId('public-civi-open'));

    const handle = screen.getByTestId('public-civi-resize');
    expect(handle.className).toMatch(/left-0/);
    expect(handle.className).toMatch(/top-0/);

    const thread = screen.getByTestId('public-civi-thread');
    expect(thread.className).toContain('civi-thread-scroll');
    expect(thread.className).toContain('touch-pan-y');
    expect(thread.style.scrollbarWidth).toBe('none');
  });
});
