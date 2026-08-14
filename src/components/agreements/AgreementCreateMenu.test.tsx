import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { AgreementCreateMenu } from '@/components/agreements/AgreementCreateMenu';
import { baseTranslations, translateMessage } from '@/lib/i18n';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, vars?: Record<string, string | number>) => translateMessage(baseTranslations, key, vars),
    language: 'en',
  }),
}));

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>;
}

function renderMenu() {
  return render(
    <MemoryRouter initialEntries={['/agreements']}>
      <Routes>
        <Route
          path="*"
          element={(
            <>
              <AgreementCreateMenu />
              <LocationProbe />
            </>
          )}
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('AgreementCreateMenu', () => {
  it('lists common types with Sale / Purchase and keeps More agreement types last', () => {
    renderMenu();
    fireEvent.click(screen.getByTestId('agreements-create'));

    const items = screen.getAllByRole('menuitem');
    expect(items.map((item) => item.textContent)).toEqual([
      'General Agreement',
      'Partnership / Collaboration',
      'Employment Agreement',
      'Service / Contribution',
      'Sale / Purchase',
      'Lease',
      'Funding / Sponsorship',
      'More agreement types…',
    ]);
    expect(screen.queryByRole('menuitem', { name: 'Other' })).not.toBeInTheDocument();
    expect(screen.getByTestId('agreements-type-search')).toBeInTheDocument();
  });

  it('reveals specialized types in the same menu and opens that create flow', () => {
    renderMenu();
    fireEvent.click(screen.getByTestId('agreements-create'));
    fireEvent.click(screen.getByTestId('agreements-more-types'));

    expect(screen.getByRole('menuitem', { name: 'Pilot / Collaboration Agreement' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Pilot / Collaboration Agreement' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/agreements/new?type=pilot');
  });

  it('opens Sale / Purchase directly and lets unmatched search add a custom type', () => {
    renderMenu();
    fireEvent.click(screen.getByTestId('agreements-create'));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Sale / Purchase' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/agreements/new?type=sale_purchase');
  });

  it('adds a custom type from search when no option matches', () => {
    renderMenu();
    fireEvent.click(screen.getByTestId('agreements-create'));
    fireEvent.change(screen.getByTestId('agreements-type-search'), { target: { value: 'Distribution Agreement' } });
    fireEvent.click(screen.getByTestId('agreements-add-type'));
    expect(screen.getByTestId('location').textContent).toContain('type=custom');
    expect(screen.getByTestId('location').textContent).toContain('customType=Distribution+Agreement');
  });

  it('offers Employment from search aliases instead of a custom type', () => {
    renderMenu();
    fireEvent.click(screen.getByTestId('agreements-create'));
    fireEvent.change(screen.getByTestId('agreements-type-search'), { target: { value: 'job' } });
    expect(screen.getByRole('menuitem', { name: 'Employment Agreement' })).toBeInTheDocument();
    expect(screen.queryByTestId('agreements-add-type')).not.toBeInTheDocument();
  });

  it('offers Lease from Car and Equipment search instead of a custom type', () => {
    renderMenu();
    fireEvent.click(screen.getByTestId('agreements-create'));
    fireEvent.change(screen.getByTestId('agreements-type-search'), { target: { value: 'car' } });
    expect(screen.getByRole('menuitem', { name: 'Lease' })).toBeInTheDocument();
    expect(screen.queryByTestId('agreements-add-type')).not.toBeInTheDocument();
    fireEvent.change(screen.getByTestId('agreements-type-search'), { target: { value: 'Equipment lease' } });
    expect(screen.getByRole('menuitem', { name: 'Lease' })).toBeInTheDocument();
    expect(screen.queryByTestId('agreements-add-type')).not.toBeInTheDocument();
  });
});
