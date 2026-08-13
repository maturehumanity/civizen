import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import KnowledgeSpaces from '@/pages/contribute/KnowledgeSpaces';

const listBrowsableKnowledgeSpaces = vi.fn();
const listManagedKnowledgeSpaces = vi.fn();
const listOwnedLinkedProfileIds = vi.fn();

vi.mock('@/components/layout/AppLayout', () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
  }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    profile: { id: 'user-1' },
  }),
}));

vi.mock('@/lib/knowledge-api', () => ({
  listBrowsableKnowledgeSpaces: (...args: unknown[]) => listBrowsableKnowledgeSpaces(...args),
  listManagedKnowledgeSpaces: (...args: unknown[]) => listManagedKnowledgeSpaces(...args),
}));

vi.mock('@/lib/opportunities-api', () => ({
  listOwnedLinkedProfileIds: (...args: unknown[]) => listOwnedLinkedProfileIds(...args),
}));

const openSpace = {
  id: 'space-1',
  publisherProfileId: 'coord-1',
  programId: 'prog-1',
  title: 'Neighborhood practical knowledge',
  summary: 'Short, reusable notes on health, learning, food, and shared spaces that neighbors can actually use.',
  description: 'Deeper collection notes stay off the card.',
  areaNodeId: null,
  status: 'shared',
  createdAt: '2026-08-13T00:00:00.000Z',
  updatedAt: '2026-08-13T00:00:00.000Z',
};

describe('KnowledgeSpaces', () => {
  beforeEach(() => {
    listBrowsableKnowledgeSpaces.mockResolvedValue([openSpace]);
    listManagedKnowledgeSpaces.mockResolvedValue([]);
    listOwnedLinkedProfileIds.mockResolvedValue([]);
  });

  it('shows a concise knowledge-space card without deeper collection notes', async () => {
    render(
      <MemoryRouter>
        <KnowledgeSpaces />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Neighborhood practical knowledge')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Short, reusable notes on health, learning, food, and shared spaces that neighbors can actually use.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('contribute.knowledge.spaceStage.shared')).toBeInTheDocument();
    expect(screen.getByText('contribute.knowledge.cardAction.view')).toBeInTheDocument();
    expect(screen.getByText('contribute.knowledge.create')).toBeInTheDocument();
    expect(screen.queryByText(openSpace.description)).not.toBeInTheDocument();
    expect(screen.queryByText('contribute.placeholder.comingSoonTitle')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Neighborhood practical knowledge/ })).toHaveAttribute(
      'href',
      '/contribute/knowledge/space-1',
    );
  });
});
