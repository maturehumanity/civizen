import { render, screen, waitFor } from '@testing-library/react';
import { Suspense, type ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import UsersAdmin from '@/pages/settings/UsersAdmin';
import { manageableRoles } from '@/lib/users-admin';

const { supabaseMock, rpcMock, fromMock } = vi.hoisted(() => {
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
  const rpcMock = vi.fn(async (name: string) => {
    if (name === 'governance_emergency_access_ops_policy_summary') {
      return {
        data: [
          {
            policy_key: 'default',
            policy_name: 'Default',
            pending_max_age_hours: 24,
            approved_max_age_minutes: 120,
            near_expiry_window_minutes: 15,
            escalation_enabled: true,
            oncall_channel: 'public_audit_ops',
            updated_at: '2026-04-25T00:00:00.000Z',
          },
        ],
        error: null,
      };
    }
    if (name === 'governance_emergency_access_event_summary') {
      return {
        data: [
          {
            lookback_hours: 168,
            request_count: 0,
            approved_count: 0,
            rejected_count: 0,
            expired_count: 0,
            consumed_count: 0,
            pending_count: 0,
            latest_event_at: null,
          },
        ],
        error: null,
      };
    }
    if (name === 'governance_emergency_access_ops_summary') {
      return {
        data: [
          {
            pending_count: 0,
            stale_pending_count: 0,
            approved_unconsumed_count: 0,
            near_expiry_approved_count: 0,
            consumed_count: 0,
            rejected_count: 0,
            expired_count: 0,
            latest_request_at: null,
            latest_event_at: null,
          },
        ],
        error: null,
      };
    }
    return { data: [], error: null };
  });

  return {
    fromMock,
    rpcMock,
    supabaseMock: {
      from: fromMock,
      rpc: rpcMock,
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
  AppLayout: ({
    children,
    topChromeBeforeSearch,
  }: {
    children: ReactNode;
    topChromeBeforeSearch?: ReactNode;
  }) => (
    <div data-testid="users-admin-layout">
      {topChromeBeforeSearch}
      {children}
    </div>
  ),
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
    rpcMock.mockClear();
    fromMock.mockClear();
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
    expect(screen.getByTestId('users-admin-add-user')).toBeInTheDocument();
  });

  it('loads emergency access data once without policy-driven reload loop', async () => {
    render(
      <MemoryRouter>
        <Suspense fallback={<div>loading</div>}>
          <UsersAdmin />
        </Suspense>
      </MemoryRouter>,
    );

    await screen.findByTestId('users-admin-layout');

    await waitFor(() => {
      expect(rpcMock).toHaveBeenCalledWith(
        'governance_emergency_access_event_summary',
        expect.objectContaining({ requested_lookback_hours: 168 }),
      );
    });

    const eventSummaryCalls = () =>
      rpcMock.mock.calls.filter((call) => call[0] === 'governance_emergency_access_event_summary').length;

    const firstCount = eventSummaryCalls();
    expect(firstCount).toBeGreaterThanOrEqual(1);

    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(eventSummaryCalls()).toBe(firstCount);
  });
});
