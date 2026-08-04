import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AppLayout } from '@/components/layout/AppLayout';

vi.mock('@/components/layout/AppTopChrome', () => ({
  AppTopChrome: () => <div data-testid="app-top-chrome" />,
}));

vi.mock('@/components/layout/MobileNav', () => ({
  MobileNav: () => <nav data-testid="mobile-nav" />,
}));

describe('AppLayout', () => {
  it('renders floating top chrome by default', () => {
    render(
      <AppLayout>
        <div>content</div>
      </AppLayout>,
    );

    expect(screen.getByTestId('app-top-chrome')).toBeInTheDocument();
    expect(screen.getByTestId('mobile-nav')).toBeInTheDocument();
  });

  it('hides floating top chrome when hideTopChrome is set', () => {
    render(
      <AppLayout hideTopChrome>
        <div>content</div>
      </AppLayout>,
    );

    expect(screen.queryByTestId('app-top-chrome')).not.toBeInTheDocument();
    expect(screen.getByTestId('mobile-nav')).toBeInTheDocument();
  });
});
