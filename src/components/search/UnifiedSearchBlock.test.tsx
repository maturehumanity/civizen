import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { UnifiedSearchBlock } from '@/components/search/UnifiedSearchBlock';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => <div {...props}>{children}</div>,
  },
}));

vi.mock('@/integrations/supabase/client', () => {
  const result = { data: [], error: null };
  const builder: Record<string, unknown> = {};
  const chain = () => builder;
  Object.assign(builder, {
    select: chain,
    eq: chain,
    neq: chain,
    is: chain,
    or: chain,
    limit: chain,
    then: (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve),
  });
  return {
    supabase: {
      from: () => builder,
    },
  };
});

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    profile: { id: 'user-1', full_name: 'Test User', username: 'test' },
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

vi.mock('@/lib/use-market-published-listings', () => ({
  useMarketPublishedListings: () => ({ listings: [] }),
}));

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location-search">{location.search}</div>;
}

function renderSearch(initialEntry = '/search?tab=all') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route
          path="/search"
          element={
            <>
              <UnifiedSearchBlock showTitle syncUrlParams />
              <LocationProbe />
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('UnifiedSearchBlock URL sync', () => {
  it('keeps multi-character typing in the input and URL', async () => {
    renderSearch();

    const input = screen.getByPlaceholderText(/search/i);
    fireEvent.change(input, { target: { value: 'c' } });
    fireEvent.change(input, { target: { value: 'ci' } });
    fireEvent.change(input, { target: { value: 'civ' } });

    expect(input).toHaveValue('civ');

    await waitFor(() => {
      expect(screen.getByTestId('location-search').textContent).toMatch(/q=civ/);
    });
  });
});
