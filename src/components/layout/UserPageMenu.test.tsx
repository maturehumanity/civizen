import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { UserPageMenu } from '@/components/layout/UserPageMenu';

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => <div {...props}>{children}</div>,
  },
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () =>
        Promise.resolve({ data: [], error: null }),
      insert: () => Promise.resolve({ data: null, error: null }),
    }),
    functions: {
      invoke: async () => ({ data: null, error: null }),
    },
  },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    profile: {
      id: 'biz-profile',
      full_name: 'Civizen',
      username: 'civizen',
      avatar_url: null,
      effective_permissions: [],
    },
    knownAccountSessions: [
      {
        userId: 'personal-user',
        profileId: 'personal-profile',
        fullName: 'Armen Yeremyan',
        username: 'armen',
        avatarUrl: null,
        accountType: 'personal',
      },
    ],
    canSwitchBack: true,
    switchBackToPreviousAccount: async () => ({ error: null }),
    switchToKnownAccount: async () => ({ error: null }),
    pruneKnownAccountSessions: () => {},
    signIn: async () => ({ error: null }),
    signInWithOtp: async () => ({ error: null }),
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

describe('UserPageMenu account switcher', () => {
  it('keeps per-card Switch and omits the header Switch back control', () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <UserPageMenu />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByTestId('user-page-menu-trigger'));

    expect(screen.getByText('Accounts')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /switch back/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^switch$/i })).toBeInTheDocument();
    expect(screen.getAllByText('Current').length).toBeGreaterThan(0);
  });
});
