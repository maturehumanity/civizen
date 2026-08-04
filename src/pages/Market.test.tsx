import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import Market from '@/pages/Market';

vi.mock('@/components/layout/AppLayout', () => ({
  AppLayout: ({
    children,
    hideTopChrome,
  }: {
    children: React.ReactNode;
    hideTopChrome?: boolean;
  }) => (
    <div data-testid="app-layout" data-hide-top-chrome={hideTopChrome ? 'true' : 'false'}>
      {children}
    </div>
  ),
}));

vi.mock('@/components/layout/UserPageMenu', () => ({
  UserPageMenu: () => <div data-testid="user-page-menu-trigger" />,
}));

vi.mock('@/hooks/usePageSecondaryNav', () => ({
  usePageSecondaryNav: () => {},
}));

vi.mock('@/lib/use-market-published-listings', () => ({
  useMarketPublishedListings: () => ({ listings: [], loading: false, error: null, refresh: () => {} }),
  useMarketMyPublishedListings: () => ({ listings: [], loading: false, error: null, refresh: () => {} }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1' },
    profile: { id: 'profile-1', full_name: 'Test User', avatar_url: null },
  }),
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

describe('Market', () => {
  it('hides app-wide top chrome and keeps Profile in the page header', async () => {
    render(
      <MemoryRouter initialEntries={['/market']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Market />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('app-layout')).toHaveAttribute('data-hide-top-chrome', 'true');
    expect(await screen.findByTestId('user-page-menu-trigger')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Agreements' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Prototype credits' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Search' })).toBeInTheDocument();
  });
});
