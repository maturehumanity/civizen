import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AiAgentSettings from '@/pages/settings/AiAgentSettings';

const authProfileState: { profile: { role: string } | null } = {
  profile: { role: 'founder' },
};

vi.mock('@/components/layout/AppLayout', () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    get profile() {
      return authProfileState.profile;
    },
  }),
}));

vi.mock('@/contexts/LanguageContext', async () => {
  const { baseTranslations, translateMessage } = await import('@/lib/i18n');
  return {
    useLanguage: () => ({
      t: (key: string, vars?: Record<string, string | number>) => translateMessage(baseTranslations, key, vars),
      language: 'en',
    }),
  };
});

const listCiviInteractions = vi.fn();

vi.mock('@/lib/assistant/civi-interactions', () => ({
  listCiviInteractions: (...args: unknown[]) => listCiviInteractions(...args),
}));

describe('AI Agent settings', () => {
  beforeEach(() => {
    authProfileState.profile = { role: 'founder' };
    listCiviInteractions.mockReset();
  });

  it('shows grouped questions and answers for the founder', async () => {
    listCiviInteractions.mockResolvedValue([
      {
        id: '1',
        createdAt: new Date().toISOString(),
        audience: 'guest',
        channel: 'public',
        question: 'What is Civizen?',
        answer: 'Civizen is an open participatory system.',
        source: 'knowledge',
        remembered: false,
        actorName: null,
        actorUsername: null,
      },
    ]);

    render(
      <MemoryRouter>
        <AiAgentSettings />
      </MemoryRouter>,
    );

    expect(await screen.findByText('What is Civizen?')).toBeInTheDocument();
    expect(screen.getByText(/Visitor/)).toBeInTheDocument();
    expect(screen.getByText(/Project knowledge/)).toBeInTheDocument();
  });

  it('sends members without review access back to Settings', () => {
    authProfileState.profile = { role: 'member' };

    render(
      <MemoryRouter initialEntries={['/settings/ai-agent']}>
        <AiAgentSettings />
      </MemoryRouter>,
    );

    expect(screen.queryByText('AI Agent')).not.toBeInTheDocument();
  });
});
