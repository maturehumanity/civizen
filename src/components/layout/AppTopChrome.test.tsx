import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { AppTopChrome } from '@/components/layout/AppTopChrome';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1' },
    profile: { id: 'profile-1', effective_permissions: [] },
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

vi.mock('@/components/layout/UserPageMenu', () => ({
  UserPageMenu: () => <div data-testid="user-page-menu-trigger" />,
}));

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location-path">{location.pathname}</div>;
}

describe('AppTopChrome back control', () => {
  it('omits back on Home and shows Search', () => {
    render(
      <MemoryRouter initialEntries={['/']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AppTopChrome />
      </MemoryRouter>,
    );

    expect(screen.queryByTestId('app-top-chrome-back')).not.toBeInTheDocument();
    expect(screen.getByTestId('app-top-chrome-search')).toBeInTheDocument();
  });

  it('shows back on Settings and returns to Home when history cannot pop', () => {
    render(
      <MemoryRouter initialEntries={['/settings']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route
            path="*"
            element={
              <>
                <AppTopChrome />
                <LocationProbe />
              </>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId('app-top-chrome-back')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('app-top-chrome-back'));
    expect(screen.getByTestId('location-path')).toHaveTextContent('/');
  });
});
