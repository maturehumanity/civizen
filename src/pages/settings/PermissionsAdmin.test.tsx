import { fireEvent, render, screen, within } from '@testing-library/react';
import { type HTMLAttributes, type ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import PermissionsAdmin from '@/pages/settings/PermissionsAdmin';

const { supabaseMock, fromMock, MotionPassthrough } = vi.hoisted(() => {
  const result = { data: [] as unknown[], error: null as null | { message: string } };
  const builder: Record<string, unknown> = {};
  const chain = () => builder;
  Object.assign(builder, {
    select: chain,
    insert: chain,
    update: chain,
    upsert: chain,
    delete: chain,
    eq: chain,
    neq: chain,
    in: chain,
    is: chain,
    order: chain,
    limit: chain,
    range: chain,
    single: async () => ({ data: null, error: null }),
    maybeSingle: async () => ({ data: null, error: null }),
    then: (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve),
  });

  const fromMock = vi.fn(() => builder);

  function MotionPassthrough({
    children,
    ...props
  }: HTMLAttributes<HTMLElement> & Record<string, unknown>) {
    const { initial: _i, animate: _a, transition: _t, ...rest } = props;
    return <div {...(rest as HTMLAttributes<HTMLElement>)}>{children}</div>;
  }

  return {
    fromMock,
    MotionPassthrough,
    supabaseMock: {
      from: fromMock,
      auth: {
        getSession: async () => ({ data: { session: null }, error: null }),
        getUser: async () => ({ data: { user: null }, error: null }),
      },
    },
  };
});

vi.mock('framer-motion', () => ({
  motion: {
    div: MotionPassthrough,
  },
}));

vi.mock('@/components/layout/AppLayout', () => ({
  AppLayout: ({ children }: { children: ReactNode }) => (
    <div data-testid="permissions-admin-layout">{children}</div>
  ),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    profile: {
      id: 'profile-1',
      user_id: 'user-1',
      username: 'founder',
      full_name: 'Founder',
      role: 'founder',
      is_admin: true,
      effective_permissions: ['settings.manage'],
    },
    refreshProfile: async () => {},
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

vi.mock('@/integrations/supabase/client', () => ({
  supabase: supabaseMock,
}));

describe('PermissionsAdmin page', () => {
  beforeEach(() => {
    fromMock.mockClear();
  });

  it('keeps the matrix folded behind the Permissions title chevron', async () => {
    render(
      <MemoryRouter>
        <PermissionsAdmin />
      </MemoryRouter>,
    );

    expect(await screen.findByTestId('permissions-admin-layout')).toBeInTheDocument();
    const pageToggle = screen.getByTestId('permissions-matrix-toggle');
    expect(pageToggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByTestId('permissions-section-toggle-home')).not.toBeInTheDocument();
    expect(screen.queryByText('Feature')).not.toBeInTheDocument();
  });

  it('unlocks the matrix from the title, then folds groups by clicking their names', async () => {
    render(
      <MemoryRouter>
        <PermissionsAdmin />
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByTestId('permissions-matrix-toggle'));

    expect(screen.getByTestId('permissions-matrix-toggle')).toHaveAttribute('aria-expanded', 'true');
    expect(await screen.findByTestId('permissions-section-toggle-home')).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('button', { name: /^Create$/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('permissions-section-toggle-home'));

    expect(screen.getByTestId('permissions-section-toggle-home')).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: /^Create$/ })).toBeInTheDocument();

    const messagingToggle = screen.getByTestId('permissions-page-toggle-home:messaging');
    expect(messagingToggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('button', { name: /^Send$/ })).not.toBeInTheDocument();

    fireEvent.click(messagingToggle);

    const messagingToggleOpen = screen.getByTestId('permissions-page-toggle-home:messaging');
    expect(messagingToggleOpen).toHaveAttribute('aria-expanded', 'true');
    const messagingCard = messagingToggleOpen.closest('.overflow-hidden');
    expect(messagingCard).toBeTruthy();
    expect(within(messagingCard as HTMLElement).getByRole('button', { name: /^Send$/ })).toBeInTheDocument();
  });
});
