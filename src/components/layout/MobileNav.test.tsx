import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { MobileNav } from '@/components/layout/MobileNav';
import { PageSecondaryNavProvider } from '@/contexts/PageSecondaryNavContext';

vi.mock('framer-motion', () => ({
  motion: {
    button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
      <button type="button" {...props}>
        {children}
      </button>
    ),
  },
}));

vi.mock('@/components/layout/NavSecondaryCarousel', () => ({
  NavSecondaryCarousel: () => null,
}));

vi.mock('@/components/layout/NavSecondaryStrip', () => ({
  NavSecondaryStrip: () => null,
}));

vi.mock('@/contexts/LanguageContext', async () => {
  const { baseTranslations, translateMessage } = await import('@/lib/i18n');

  return {
    useLanguage: () => ({
      language: 'en',
      setLanguage: async () => {},
      t: (key: string, vars?: Record<string, string | number>) => translateMessage(baseTranslations, key, vars),
      getNode: (key: string) => key,
      languageOptions: [{ code: 'en', label: 'English' }],
      isLoadingLanguage: false,
    }),
  };
});

describe('MobileNav', () => {
  it('shows Home Study Contribute Market Messaging and omits Settings', () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <PageSecondaryNavProvider>
          <MobileNav />
        </PageSecondaryNavProvider>
      </MemoryRouter>,
    );

    const labels = ['Home', 'Study', 'Contribute', 'Market', 'Messaging'];
    for (const label of labels) {
      expect(screen.getByRole('button', { name: new RegExp(label, 'i') })).toBeInTheDocument();
    }
    expect(screen.queryByRole('button', { name: /^settings$/i })).not.toBeInTheDocument();

    const buttons = screen.getAllByRole('button').filter((button) =>
      labels.some((label) => button.textContent?.includes(label)),
    );
    expect(buttons.map((button) => button.textContent?.replace(/\s+/g, ' ').trim())).toEqual(labels);
  });
});
