import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { HappinessLevel } from '@/lib/happiness/types';

const workspaceState = vi.hoisted(() => ({
  level: null as HappinessLevel | null,
  loading: false,
  throwOnRender: false,
}));

vi.mock('@/lib/happiness/use-happiness-shortcut', () => ({
  useHappinessShortcutLevel: () => {
    if (workspaceState.throwOnRender) {
      throw new Error('happiness shortcut unavailable');
    }
    return {
      level: workspaceState.level,
      loading: workspaceState.loading,
    };
  },
}));

vi.mock('@/contexts/LanguageContext', async () => {
  const { baseTranslations, translateMessage } = await import('@/lib/i18n');
  return {
    useLanguage: () => ({
      language: 'en',
      t: (key: string, vars?: Record<string, string | number>) => translateMessage(baseTranslations, key, vars),
    }),
  };
});

import { HappinessStateMark, HomeHappinessShortcut } from '@/components/home/HomeHappinessShortcut';

function renderShortcut() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route
          path="/"
          element={
            <div>
              <p>YOUR CIVIZEN SCORE</p>
              <p>61.0 / 100</p>
              <p>CONTRIBUTOR</p>
              <HomeHappinessShortcut profileId="profile-1" />
            </div>
          }
        />
        <Route path="/happiness" element={<div>Happiness workspace</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('Home Happiness shortcut', () => {
  it('renders a state icon with an accessible name and no numeric Happiness value', () => {
    workspaceState.level = 'balanced';
    workspaceState.loading = false;
    workspaceState.throwOnRender = false;
    renderShortcut();
    const shortcut = screen.getByRole('link', {
      name: 'Open Happiness & Fulfillment. Current level: Balanced.',
    });
    expect(shortcut).toBeTruthy();
    expect(shortcut.className).toMatch(/h-\[28px\]/);
    expect(shortcut.className).toMatch(/rounded-full/);
    expect(shortcut.querySelector('[data-happiness-state="balanced"]')).toBeTruthy();
    expect(shortcut.querySelector('[data-happiness-curve="balanced"]')).toBeTruthy();
    expect(shortcut.querySelector('[data-happiness-state]')?.textContent).toBe('');
    const tooltip = shortcut.querySelector('[data-home-happiness-tooltip]');
    expect(tooltip?.textContent).toContain('Happiness & Fulfillment');
    expect(tooltip?.textContent).toContain('Balanced');
    expect(tooltip?.textContent).not.toMatch(/Current level|Complete a review/i);
    expect(screen.getByText('61.0 / 100')).toBeTruthy();
    expect(screen.getByText('CONTRIBUTOR')).toBeTruthy();
  });

  it('uses an unassessed icon when there is not enough Happiness data', () => {
    workspaceState.level = null;
    workspaceState.throwOnRender = false;
    renderShortcut();
    const shortcut = screen.getByRole('link', {
      name: 'Open Happiness & Fulfillment. Current level not established yet.',
    });
    expect(shortcut.querySelector('[data-happiness-state="unassessed"]')).toBeTruthy();
    expect(shortcut.querySelector('[data-happiness-curve]')).toBeNull();
    expect(shortcut.querySelector('circle')?.getAttribute('stroke-dasharray')).toBeNull();
    expect(shortcut.querySelectorAll('path')).toHaveLength(0);
    const tooltip = shortcut.querySelector('[data-home-happiness-tooltip]');
    expect(tooltip?.textContent).toContain('Not assessed yet');
    expect(tooltip?.textContent).not.toMatch(/Complete a review/i);
  });

  it('navigates to /happiness on click and Space', () => {
    workspaceState.level = 'flourishing';
    workspaceState.throwOnRender = false;
    const { unmount } = renderShortcut();
    fireEvent.click(
      screen.getByRole('link', { name: /Open Happiness & Fulfillment\. Current level: Flourishing\./ }),
    );
    expect(screen.getByText('Happiness workspace')).toBeTruthy();
    unmount();

    renderShortcut();
    fireEvent.keyDown(
      screen.getByRole('link', { name: /Open Happiness & Fulfillment\. Current level: Flourishing\./ }),
      { key: ' ' },
    );
    expect(screen.getByText('Happiness workspace')).toBeTruthy();
  });

  it('keeps the five states in one mark system with distinct curves', () => {
    const curves = ['struggling', 'unsettled', 'balanced', 'flourishing', 'thriving'].map((level) => {
      const { container, unmount } = render(<HappinessStateMark level={level as HappinessLevel} />);
      const curve = container.querySelector('[data-happiness-curve]')?.getAttribute('d');
      unmount();
      return curve;
    });
    expect(new Set(curves).size).toBe(5);
  });

  it('still shows the Score context when Happiness loading fails', () => {
    workspaceState.level = null;
    workspaceState.throwOnRender = false;
    renderShortcut();
    expect(screen.getByText('YOUR CIVIZEN SCORE')).toBeTruthy();
    expect(screen.getByText('61.0 / 100')).toBeTruthy();
    expect(
      screen.getByRole('link', { name: 'Open Happiness & Fulfillment. Current level not established yet.' }),
    ).toBeTruthy();
  });

  it('does not take Home down if Happiness render throws', () => {
    workspaceState.throwOnRender = true;
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render(
      <MemoryRouter>
        <div>
          <p>YOUR CIVIZEN SCORE</p>
          <HomeHappinessShortcut profileId="profile-1" />
        </div>
      </MemoryRouter>,
    );
    expect(screen.getByText('YOUR CIVIZEN SCORE')).toBeTruthy();
    expect(screen.queryByRole('link', { name: /Open Happiness & Fulfillment/ })).toBeNull();
    consoleSpy.mockRestore();
  });
});
