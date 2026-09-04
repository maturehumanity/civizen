import { fireEvent, render, screen } from '@testing-library/react';
import { type HTMLAttributes, type ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const focusChromeMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/home-post-composer-focus', () => ({
  focusHomePostComposerFromChrome: (...args: unknown[]) => focusChromeMock(...args),
}));

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
    gt: chain,
    gte: chain,
    lt: chain,
    lte: chain,
    like: chain,
    ilike: chain,
    is: chain,
    in: chain,
    contains: chain,
    range: chain,
    order: chain,
    limit: chain,
    offset: chain,
    match: chain,
    filter: chain,
    not: chain,
    or: chain,
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
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => undefined } } }),
      },
      channel: () => ({
        on() {
          return this;
        },
        subscribe: () => ({ unsubscribe: () => undefined }),
      }),
      removeChannel: () => undefined,
    },
  };
});

vi.mock('framer-motion', () => ({
  motion: new Proxy(
    {},
    {
      get: () =>
        ({ children, ...props }: HTMLAttributes<HTMLElement> & Record<string, unknown>) => {
          const {
            layoutId: _layoutId,
            whileTap: _whileTap,
            whileHover: _whileHover,
            initial: _initial,
            animate: _animate,
            exit: _exit,
            transition: _transition,
            variants: _variants,
            ...rest
          } = props;
          return <div {...(rest as HTMLAttributes<HTMLElement>)}>{children}</div>;
        },
    },
  ),
  AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/layout/AppLayout', () => ({
  AppLayout: ({ children }: { children: ReactNode }) => <div data-testid="app-layout">{children}</div>,
}));

vi.mock('@/hooks/usePageSecondaryNav', () => ({
  usePageSecondaryNav: () => {},
}));

vi.mock('@/lib/use-development-stories', () => ({
  useDevelopmentStories: () => ({ stories: [], loading: false }),
}));

vi.mock('@/lib/civizen-contributions', () => ({
  loadContributionEventsThenSync: async () => [],
  scoreContributionsFromEvents: () => ({ score: null, confidence: null, eventCount: 0 }),
  demonstratedSkillsFromContributionEvents: () => [],
  demonstratedProjectsFromContributionEvents: () => [],
}));

vi.mock('@/lib/civizen-performance', () => ({
  loadPerformanceRatings: async () => [],
  scorePerformanceFromEvents: () => ({ score: null, confidence: null }),
}));

vi.mock('@/lib/civizen-org-account', () => ({
  canShowPublishToSocial: () => false,
  isOfficialCivizenOrgProfile: async () => false,
  SOCIAL_PROVIDERS: [],
}));

vi.mock('@/lib/social-accounts', () => ({
  fetchSocialConnectionStatuses: async () => [],
  fetchSocialCrosspostsForPosts: async () => ({}),
  providerDisplayName: (provider: string) => provider,
  publishPostToSocial: async () => ({ ok: false }),
}));

vi.mock('@/lib/post-views', () => ({
  fetchPostViewStats: async () => ({}),
  isRecordablePostId: () => false,
  recordPostView: async () => null,
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    profile: {
      id: 'profile-1',
      user_id: 'user-1',
      username: 'armen',
      full_name: 'Armen',
      avatar_url: null,
      role: 'founder',
      is_admin: true,
      is_verified: true,
      effective_permissions: [],
      custom_permissions: [],
      granted_permissions: [],
      denied_permissions: [],
      citizenship_status: 'citizen',
      experience_level: 'professional',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    user: { id: 'user-1' },
    session: { user: { id: 'user-1' } },
    loading: false,
    signIn: async () => ({ error: null }),
    signUp: async () => ({ error: null }),
    signOut: async () => {},
    refreshProfile: async () => {},
  }),
}));

vi.mock('@/contexts/LanguageContext', async () => {
  const { baseTranslations, translateMessage } = await import('@/lib/i18n');
  return {
    useLanguage: () => ({
      language: 'en',
      setLanguage: async () => {},
      t: (key: string, vars?: Record<string, string | number>) =>
        translateMessage(baseTranslations, key, vars),
      getNode: (key: string) => key,
      languageOptions: [{ code: 'en', label: 'English' }],
      isLoadingLanguage: false,
    }),
  };
});

vi.mock('@/lib/happiness/use-happiness-shortcut', () => ({
  useHappinessShortcutLevel: () => ({
    level: 'balanced',
    loading: false,
  }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: supabaseMock,
}));

vi.stubGlobal(
  'IntersectionObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

describe('Home post composer focus', () => {
  beforeEach(() => {
    localStorage.clear();
    focusChromeMock.mockClear();
    focusChromeMock.mockImplementation((event: { preventDefault: () => void }, editor: HTMLElement | null) => {
      event.preventDefault();
      editor?.focus();
      return true;
    });
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('keeps an empty composer field tall enough and chrome-tagged for focus wiring', async () => {
    const Home = (await import('@/pages/Home')).default;
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    const editor = await screen.findByRole('textbox', {
      name: 'Share an idea, update, or opportunity...',
    });
    expect(editor).toHaveAttribute('contenteditable', 'true');
    expect(editor.tabIndex).toBe(0);
    expect(editor.className).toMatch(/min-h-10/);

    const chrome = document.querySelector('[data-home-post-composer]');
    expect(chrome).toBeTruthy();

    // Clicking non-editor chrome must route through the shared focus helper.
    fireEvent.mouseDown(chrome!);
    expect(focusChromeMock).toHaveBeenCalled();
    expect(focusChromeMock.mock.calls[0]?.[1]).toBeInstanceOf(HTMLElement);
  }, 15000);

  it('shows a restrained formatting toolbar when the composer is focused', async () => {
    const Home = (await import('@/pages/Home')).default;
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    const editor = await screen.findByRole('textbox', {
      name: 'Share an idea, update, or opportunity...',
    });
    const chrome = document.querySelector('[data-home-post-composer]');
    expect(chrome).toBeTruthy();
    fireEvent.mouseDown(chrome!);

    const card = document.querySelector('[data-home-post-composer-card]');
    expect(card).toHaveAttribute('data-home-composer-focused', 'true');
    expect(document.querySelector('[data-post-format-toolbar]')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Bold' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Font' })).toBeNull();
  }, 15000);
});

describe('Home Happiness shortcut on the Score card', () => {
  it('shows a Happiness state icon without extra wording or a Happiness number', async () => {
    const Home = (await import('@/pages/Home')).default;
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    const shortcut = await screen.findByRole('link', {
      name: 'Open Happiness & Fulfillment. Current level: Balanced.',
    });
    expect(shortcut.querySelector('[data-happiness-state="balanced"]')).toBeTruthy();
    expect(shortcut.querySelector('[data-happiness-state]')?.textContent).toBe('');
    expect(shortcut).toHaveAttribute('href', '/happiness');
    expect(screen.getByRole('heading', { name: /your civizen score/i })).toBeTruthy();
    expect(screen.queryByText(/happiness score/i)).toBeNull();
  }, 15000);
});
