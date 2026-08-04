import { render, screen } from '@testing-library/react';
import { Suspense, type ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import UsersAdmin from '@/pages/settings/UsersAdmin';
import { manageableRoles } from '@/lib/users-admin';

const { supabaseMock } = vi.hoisted(() => {
  const result = { data: [], error: null };
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

  return {
    supabaseMock: {
      from: () => builder,
      rpc: async () => ({ data: [], error: null }),
      auth: {
        getSession: async () => ({ data: { session: null }, error: null }),
        getUser: async () => ({ data: { user: null }, error: null }),
      },
      channel: () => ({
        on() {
          return this;
        },
        subscribe: () => ({ unsubscribe: () => undefined }),
      }),
      removeChannel: () => undefined,
      functions: { invoke: async () => ({ data: null, error: null }) },
    },
  };
});

vi.mock('framer-motion', () => ({
  motion: new Proxy(
    {},
    {
      get: () =>
        ({ children, ...props }: React.HTMLAttributes<HTMLElement> & Record<string, unknown>) => {
          const { initial: _i, animate: _a, transition: _t, ...rest } = props;
          return <div {...(rest as React.HTMLAttributes<HTMLElement>)}>{children}</div>;
        },
    },
  ),
}));

vi.mock('@/components/layout/AppLayout', () => ({
  AppLayout: ({ children }: { children: ReactNode }) => <div data-testid="users-admin-layout">{children}</div>,
}));

vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => false,
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
      effective_permissions: ['role.assign', 'settings.manage'],
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

describe('UsersAdmin page', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('exports manageableRoles for create-user dialog wiring', () => {
    expect(manageableRoles.length).toBeGreaterThan(0);
    expect(manageableRoles).not.toContain('system');
  });

  it('mounts without ReferenceError (Select / manageableRoles)', async () => {
    render(
      <MemoryRouter>
        <Suspense fallback={<div>loading</div>}>
          <UsersAdmin />
        </Suspense>
      </MemoryRouter>,
    );

    expect(await screen.findByTestId('users-admin-layout')).toBeInTheDocument();
  });
});
