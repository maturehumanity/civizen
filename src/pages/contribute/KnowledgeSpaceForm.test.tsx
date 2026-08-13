import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import KnowledgeSpaceForm from '@/pages/contribute/KnowledgeSpaceForm';

const createKnowledgeSpace = vi.fn();
const getKnowledgeSpace = vi.fn();
const listManagedPrograms = vi.fn();
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
    profile: { id: 'coord-1' },
  }),
}));

vi.mock('@/lib/challenges-api', () => ({
  listManagedPrograms: (...args: unknown[]) => listManagedPrograms(...args),
  createContributionProgram: vi.fn(),
}));

vi.mock('@/lib/knowledge-api', () => ({
  createKnowledgeSpace: (...args: unknown[]) => createKnowledgeSpace(...args),
  updateKnowledgeSpace: vi.fn(),
  setKnowledgeSpaceStatus: vi.fn(),
  getKnowledgeSpace: (...args: unknown[]) => getKnowledgeSpace(...args),
}));

vi.mock('@/lib/opportunities-api', () => ({
  listOwnedLinkedProfileIds: (...args: unknown[]) => listOwnedLinkedProfileIds(...args),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe('KnowledgeSpaceForm', () => {
  beforeEach(() => {
    createKnowledgeSpace.mockResolvedValue('space-1');
    getKnowledgeSpace.mockResolvedValue(null);
    listOwnedLinkedProfileIds.mockResolvedValue([]);
    listManagedPrograms.mockResolvedValue([
      {
        id: 'prog-1',
        publisherProfileId: 'coord-1',
        title: 'Shared Knowledge Challenge',
        summary: 'Collect practical neighborhood knowledge.',
        description: null,
        status: 'active',
        programKind: 'shared_knowledge',
        areaNodeId: null,
        seedKey: null,
        createdAt: '2026-08-13T00:00:00.000Z',
        updatedAt: '2026-08-13T00:00:00.000Z',
      },
    ]);
  });

  it('asks for purpose first and keeps deeper context behind more details', async () => {
    render(
      <MemoryRouter initialEntries={['/contribute/knowledge/new']}>
        <Routes>
          <Route path="/contribute/knowledge/new" element={<KnowledgeSpaceForm />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByLabelText('contribute.knowledge.titleLabel')).toBeInTheDocument();
    expect(screen.getByLabelText('contribute.knowledge.summaryLabel')).toBeInTheDocument();
    expect(screen.queryByLabelText('contribute.knowledge.descriptionLabel')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('contribute.knowledge.moreDetails'));
    expect(screen.getByLabelText('contribute.knowledge.descriptionLabel')).toBeInTheDocument();
  });

  it('creates a knowledge space through the RPC wrapper', async () => {
    render(
      <MemoryRouter initialEntries={['/contribute/knowledge/new']}>
        <Routes>
          <Route path="/contribute/knowledge/new" element={<KnowledgeSpaceForm />} />
          <Route path="/contribute/knowledge/:spaceId" element={<div>detail</div>} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByLabelText('contribute.knowledge.titleLabel');
    fireEvent.change(screen.getByLabelText('contribute.knowledge.titleLabel'), {
      target: { value: 'Neighborhood practical knowledge' },
    });
    fireEvent.change(screen.getByLabelText('contribute.knowledge.summaryLabel'), {
      target: { value: 'Short reusable notes neighbors can actually use.' },
    });
    fireEvent.click(screen.getByText('contribute.knowledge.saveDraft'));

    await waitFor(() => {
      expect(createKnowledgeSpace).toHaveBeenCalledWith(
        expect.objectContaining({
          programId: 'prog-1',
          title: 'Neighborhood practical knowledge',
          status: 'draft',
        }),
      );
    });
  });
});
