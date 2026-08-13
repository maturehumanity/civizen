import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { PublicPageFooter } from '@/components/public/PublicPageFooter';

vi.mock('@/contexts/LanguageContext', async () => {
  const { baseTranslations, translateMessage } = await import('@/lib/i18n');

  return {
    useLanguage: () => ({
      language: 'en',
      setLanguage: async () => {},
      t: (key: string, vars?: Record<string, string | number>) =>
        translateMessage(baseTranslations, key, vars),
      getNode: (key: string) => key,
      languageOptions: [{ code: 'en', label: 'English' }],
      isLoadingLanguage: false,
    }),
  };
});

describe('PublicPageFooter', () => {
  it('includes a discovery link to Areas', () => {
    render(
      <MemoryRouter>
        <PublicPageFooter />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: 'Areas' })).toHaveAttribute('href', '/areas');
  });
});
