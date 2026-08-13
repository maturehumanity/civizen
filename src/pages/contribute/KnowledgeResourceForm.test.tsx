import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import KnowledgeResourceForm from '@/pages/contribute/KnowledgeResourceForm';

const createKnowledgeResource = vi.fn();
const getKnowledgeSpace = vi.fn();
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

vi.mock('@/lib/knowledge-api', () => ({
  createKnowledgeResource: (...args: unknown[]) => createKnowledgeResource(...args),
  updateKnowledgeResource: vi.fn(),
  getKnowledgeResource: vi.fn(),
  getKnowledgeSpace: (...args: unknown[]) => getKnowledgeSpace(...args),
}));

vi.mock('@/lib/opportunities-api', () => ({
  listOwnedLinkedProfileIds: (...args: unknown[]) => listOwnedLinkedProfileIds(...args),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe('KnowledgeResourceForm', () => {
  beforeEach(() => {
    createKnowledgeResource.mockResolvedValue('res-1');
    listOwnedLinkedProfileIds.mockResolvedValue([]);
    getKnowledgeSpace.mockResolvedValue({
      id: 'space-1',
      publisherProfileId: 'coord-1',
      programId: 'prog-1',
      title: 'Neighborhood practical knowledge',
      summary: 'Short reusable notes neighbors can actually use.',
      description: null,
      areaNodeId: null,
      status: 'shared',
      createdAt: '2026-08-13T00:00:00.000Z',
      updatedAt: '2026-08-13T00:00:00.000Z',
    });
  });

  it('attributes the current person and optional organization, keeping evidence behind details', async () => {
    render(
      <MemoryRouter initialEntries={['/contribute/knowledge/space-1/resources/new']}>
        <Routes>
          <Route
            path="/contribute/knowledge/:spaceId/resources/new"
            element={<KnowledgeResourceForm />}
          />
          <Route
            path="/contribute/knowledge/:spaceId/resources/:resourceId"
            element={<div>resource</div>}
          />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByLabelText('contribute.knowledge.titleLabel');
    expect(screen.queryByText('contribute.knowledge.sourceLabel')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('contribute.knowledge.titleLabel'), {
      target: { value: 'How to set up a surplus-food table' },
    });
    fireEvent.change(screen.getByLabelText('contribute.knowledge.summaryLabel'), {
      target: { value: 'A one-evening method for sharing leftover market food.' },
    });
    fireEvent.change(screen.getByLabelText('contribute.knowledge.organizationLabel'), {
      target: { value: 'Neighborhood Health Circle' },
    });
    fireEvent.click(screen.getByText('contribute.knowledge.saveDraft'));

    await waitFor(() => {
      expect(createKnowledgeResource).toHaveBeenCalledWith(
        expect.objectContaining({
          spaceId: 'space-1',
          resourceType: 'guide',
          attributions: [
            { attributionKind: 'person', profileId: 'coord-1' },
            { attributionKind: 'organization', organizationName: 'Neighborhood Health Circle' },
          ],
        }),
      );
    });
  });
});
