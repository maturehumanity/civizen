import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AgreementPartyToken } from '@/components/agreements/AgreementPartyToken';
import { baseTranslations, translateMessage } from '@/lib/i18n';

const searchMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/agreements-api', () => ({
  searchAgreementParties: (...args: unknown[]) => searchMock(...args),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, vars?: Record<string, string | number>) => translateMessage(baseTranslations, key, vars),
    language: 'en',
  }),
}));

function renderToken(query: string, onSelect = vi.fn()) {
  return {
    onSelect,
    ...render(
      <AgreementPartyToken
        id="party_b"
        placeholder="Party"
        ariaLabel="Search or enter person or organization"
        query={query}
        selected={null}
        classification={null}
        onQueryChange={vi.fn()}
        onSelect={onSelect}
        onClassification={vi.fn()}
      />,
    ),
  };
}

describe('AgreementPartyToken directory matching', () => {
  it('binds a unique directory match without asking person or organization', async () => {
    searchMock.mockResolvedValue([
      { profileId: 'org-1', displayName: 'Civizen', subtitle: 'civizen', civizenKind: 'organization' },
    ]);
    const { onSelect } = renderToken('Civizen');
    expect(screen.queryByRole('button', { name: 'Person' })).not.toBeInTheDocument();
    await waitFor(() => {
      expect(onSelect).toHaveBeenCalledWith({
        profileId: 'org-1',
        displayName: 'Civizen',
        civizenKind: 'organization',
      });
    });
    expect(screen.queryByRole('button', { name: 'Person' })).not.toBeInTheDocument();
  });

  it('asks the user to choose among similarly named directory matches', async () => {
    searchMock.mockResolvedValue([
      { profileId: 'p1', displayName: 'Alex Rivera', subtitle: 'alex', civizenKind: 'individual' },
      { profileId: 'p2', displayName: 'Alex Rivera', subtitle: 'alex.r', civizenKind: 'individual' },
    ]);
    const { onSelect } = renderToken('Alex Rivera');
    expect(await screen.findByText('alex')).toBeInTheDocument();
    expect(screen.getByText('alex.r')).toBeInTheDocument();
    expect(onSelect).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Person' })).not.toBeInTheDocument();
  });

  it('asks person or organization only when the name is not in the directory', async () => {
    searchMock.mockResolvedValue([]);
    renderToken('Acme');
    expect(await screen.findByRole('button', { name: 'Person' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Organization' })).toBeInTheDocument();
  });
});
