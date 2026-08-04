import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { AppPageHeader } from '@/components/layout/AppPageHeader';

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

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location-path">{location.pathname}</div>;
}

describe('AppPageHeader', () => {
  it('puts Back and title on the same row and navigates back', () => {
    render(
      <MemoryRouter initialEntries={['/settings']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route
            path="*"
            element={
              <>
                <AppPageHeader title="Settings" />
                <LocationProbe />
              </>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    const header = screen.getByTestId('app-page-header');
    const back = screen.getByTestId('app-page-header-back');
    const title = screen.getByTestId('app-page-header-title');
    expect(header.className).toContain('items-center');
    expect(back).toBeInTheDocument();
    expect(title).toHaveTextContent('Settings');
    expect(back.parentElement).toContainElement(title);

    fireEvent.click(back);
    expect(screen.getByTestId('location-path')).toHaveTextContent('/');
  });

  it('hides Back on bottom-nav hubs', () => {
    render(
      <MemoryRouter initialEntries={['/']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AppPageHeader title="Home" />
      </MemoryRouter>,
    );

    expect(screen.queryByTestId('app-page-header-back')).not.toBeInTheDocument();
    expect(screen.getByTestId('app-page-header-title')).toHaveTextContent('Home');
  });

  it('calls onBack instead of navigating when provided', () => {
    const onBack = vi.fn();
    render(
      <MemoryRouter initialEntries={['/endorse/abc']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route
            path="*"
            element={
              <>
                <AppPageHeader title="Endorse" onBack={onBack} />
                <LocationProbe />
              </>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByTestId('app-page-header-back'));
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('location-path')).toHaveTextContent('/endorse/abc');
  });
});
