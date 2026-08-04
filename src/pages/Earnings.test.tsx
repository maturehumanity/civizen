import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    profile: { id: 'seller-1' },
    loading: false,
  }),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    t: (key: string) => key,
  }),
}));

vi.mock('@/components/layout/AppLayout', () => ({
  AppLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/lib/use-seller-earnings', () => ({
  useSellerEarnings: () => ({
    filteredRows: [],
    summary: { productsSold: 0, servicesSold: 0, pendingCount: 0, signedIllustrativeLumens: 0 },
    filter: 'all',
    setFilter: vi.fn(),
    loading: false,
    error: null,
    backendMissing: false,
    refetch: vi.fn(),
  }),
}));

import Earnings from '@/pages/Earnings';

describe('Earnings page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders title, notice, and empty state', () => {
    render(
      <MemoryRouter>
        <Earnings />
      </MemoryRouter>,
    );

    expect(screen.getByText('earnings.pageTitle')).toBeTruthy();
    expect(screen.getByText('earnings.settlementNotice')).toBeTruthy();
    expect(screen.getByText('earnings.empty')).toBeTruthy();
  });
});
