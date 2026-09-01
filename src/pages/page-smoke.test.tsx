import { render } from '@testing-library/react';
import { Suspense, type ComponentType, type ReactNode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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
        signInWithPassword: async () => ({ data: { user: null, session: null }, error: null }),
        signOut: async () => ({ error: null }),
      },
      channel: () => ({
        on() {
          return this;
        },
        subscribe: () => ({ unsubscribe: () => undefined }),
      }),
      removeChannel: () => undefined,
      storage: {
        from: () => ({
          upload: async () => ({ data: null, error: null }),
          getPublicUrl: () => ({ data: { publicUrl: '' } }),
          download: async () => ({ data: null, error: null }),
        }),
      },
      functions: {
        invoke: async () => ({ data: null, error: null }),
      },
    },
  };
});

vi.mock('framer-motion', () => ({
  motion: new Proxy(
    {},
    {
      get: () =>
        ({ children, ...props }: React.HTMLAttributes<HTMLElement> & Record<string, unknown>) => {
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
          return <div {...(rest as React.HTMLAttributes<HTMLElement>)}>{children}</div>;
        },
    },
  ),
  AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/layout/AppLayout', () => ({
  AppLayout: ({ children }: { children: ReactNode }) => <div data-testid="app-layout">{children}</div>,
}));

vi.mock('@/components/layout/MobileNav', () => ({
  MobileNav: () => null,
}));

vi.mock('@/components/public/PublicPageShell', () => ({
  PublicPageShell: ({ children }: { children: ReactNode }) => <div data-testid="public-shell">{children}</div>,
}));

vi.mock('@/components/public/PublicAuthHeader', () => ({
  PublicAuthHeader: ({ title }: { title?: string }) => <h1>{title || 'Auth'}</h1>,
}));

vi.mock('@/components/public/PublicPageHeader', () => ({
  PublicPageHeader: () => <header>Public header</header>,
}));

vi.mock('@/components/public/PublicPageFooter', () => ({
  PublicPageFooter: () => <footer>Public footer</footer>,
}));

vi.mock('@/components/ui/theme-toggle', () => ({
  ThemeToggle: () => <button type="button">Theme</button>,
}));

vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => false,
}));

vi.mock('@/lib/biometric-sign-in', () => ({
  isBiometricSignInSupportedPlatform: () => false,
  getBiometricSignInCapability: async () => ({
    canUnlock: false,
    available: false,
    enabled: false,
    platformSupported: false,
  }),
  enableBiometricSignIn: async () => ({ error: null }),
  disableBiometricSignIn: async () => ({ error: null }),
  syncBiometricSessionIfEnabled: async () => {},
  unlockBiometricSession: async () => ({ error: null }),
  unlockSessionWithBiometrics: async () => ({ error: null }),
}));

vi.mock('@/hooks/usePageSecondaryNav', () => ({
  usePageSecondaryNav: () => {},
}));

vi.mock('@/contexts/PageSecondaryNavContext', () => ({
  PageSecondaryNavProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  usePageSecondaryNavContext: () => ({
    config: null,
    setConfig: () => {},
    clearConfig: () => {},
  }),
}));

const authState = {
  profile: {
    id: 'profile-1',
    user_id: 'user-1',
    username: 'founder',
    full_name: 'Founder',
    avatar_url: null,
    role: 'founder',
    is_admin: true,
    is_verified: true,
    effective_permissions: [
      'role.assign',
      'settings.manage',
      'updates.test',
      'content.read',
      'law.read',
      'market.read',
    ],
    custom_permissions: [],
    granted_permissions: [],
    denied_permissions: [],
    citizenship_status: 'citizen',
    experience_level: 'professional',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } as Record<string, unknown> | null,
};

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    profile: authState.profile,
    user: authState.profile ? { id: authState.profile.user_id } : null,
    session: authState.profile ? { user: { id: authState.profile.user_id } } : null,
    loading: false,
    signIn: async () => ({ error: null }),
    signUp: async () => ({ error: null }),
    signOut: async () => {},
    signInWithBiometrics: async () => ({ error: null }),
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

class MockIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
vi.stubGlobal('ResizeObserver', MockResizeObserver);

if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = function scrollIntoView() {};
}

type PageEntry = {
  name: string;
  path: string;
  routePath?: string;
  load: () => Promise<{ default: ComponentType<Record<string, never>> }>;
};

/** Every routed page module — import smoke catches missing default exports. */
const allPages: PageEntry[] = [
  { name: 'Home', path: '/', load: () => import('@/pages/Home') },
  { name: 'NotFound', path: '/missing-route', load: () => import('@/pages/NotFound') },
  { name: 'Login', path: '/login', load: () => import('@/pages/auth/Login') },
  { name: 'SignUp', path: '/signup', load: () => import('@/pages/auth/SignUp') },
  { name: 'ForgotPassword', path: '/forgot-password', load: () => import('@/pages/auth/ForgotPassword') },
  { name: 'ResetPassword', path: '/reset-password', load: () => import('@/pages/auth/ResetPassword') },
  { name: 'Contribute', path: '/contribute', load: () => import('@/pages/Contribute') },
  {
    name: 'MatterFormImprovement',
    path: '/contribute/matters/new?intent=improvement',
    load: () => import('@/pages/contribute/MatterForm'),
  },
  { name: 'ProfessionalOpportunities', path: '/contribute/professional', load: () => import('@/pages/contribute/ProfessionalOpportunities') },
  { name: 'OpportunityForm', path: '/contribute/professional/new', load: () => import('@/pages/contribute/OpportunityForm') },
  { name: 'OpportunityDetail', path: '/contribute/professional/opp-1', routePath: '/contribute/professional/:opportunityId', load: () => import('@/pages/contribute/OpportunityDetail') },
  { name: 'CommunityChallenges', path: '/contribute/challenges', load: () => import('@/pages/contribute/CommunityChallenges') },
  { name: 'ChallengeForm', path: '/contribute/challenges/new', load: () => import('@/pages/contribute/ChallengeForm') },
  { name: 'ChallengeDetail', path: '/contribute/challenges/ch-1', routePath: '/contribute/challenges/:challengeId', load: () => import('@/pages/contribute/ChallengeDetail') },
  { name: 'KnowledgeSpaces', path: '/contribute/knowledge', load: () => import('@/pages/contribute/KnowledgeSpaces') },
  { name: 'KnowledgeSpaceForm', path: '/contribute/knowledge/new', load: () => import('@/pages/contribute/KnowledgeSpaceForm') },
  { name: 'KnowledgeSpaceDetail', path: '/contribute/knowledge/space-1', routePath: '/contribute/knowledge/:spaceId', load: () => import('@/pages/contribute/KnowledgeSpaceDetail') },
  { name: 'KnowledgeResourceForm', path: '/contribute/knowledge/space-1/resources/new', routePath: '/contribute/knowledge/:spaceId/resources/new', load: () => import('@/pages/contribute/KnowledgeResourceForm') },
  { name: 'KnowledgeResourceDetail', path: '/contribute/knowledge/space-1/resources/res-1', routePath: '/contribute/knowledge/:spaceId/resources/:resourceId', load: () => import('@/pages/contribute/KnowledgeResourceDetail') },
  { name: 'ContributeImpact', path: '/contribute/impact', load: () => import('@/pages/contribute/ContributeImpact') },
  { name: 'Matters', path: '/contribute/matters', load: () => import('@/pages/contribute/Matters') },
  { name: 'MatterForm', path: '/contribute/matters/new', load: () => import('@/pages/contribute/MatterForm') },
  { name: 'MatterDetail', path: '/contribute/matters/mat-1', routePath: '/contribute/matters/:matterId', load: () => import('@/pages/contribute/MatterDetail') },
  { name: 'Messaging', path: '/messaging', load: () => import('@/pages/Messaging') },
  { name: 'WhyThisExists', path: '/why-this-exists', load: () => import('@/pages/WhyThisExists') },
  { name: 'Areas', path: '/areas', load: () => import('@/pages/Areas') },
  { name: 'AreaDetail', path: '/areas/education', routePath: '/areas/:slug', load: () => import('@/pages/AreaDetail') },
  { name: 'Features', path: '/features', load: () => import('@/pages/Features') },
  { name: 'Law', path: '/law', load: () => import('@/pages/Law') },
  { name: 'Market', path: '/market', load: () => import('@/pages/Market') },
  { name: 'MarketTaxonomy', path: '/market/taxonomy', load: () => import('@/pages/MarketTaxonomy') },
  { name: 'Agreements', path: '/agreements', load: () => import('@/pages/Agreements') },
  { name: 'AgreementCreate', path: '/agreements/new', load: () => import('@/pages/AgreementCreate') },
  { name: 'AgreementDetail', path: '/agreements/demo', routePath: '/agreements/:id', load: () => import('@/pages/AgreementDetail') },
  { name: 'Earnings', path: '/earnings', load: () => import('@/pages/Earnings') },
  { name: 'Happiness', path: '/happiness', load: () => import('@/pages/happiness/Happiness') },
  { name: 'HappinessCheckIn', path: '/happiness/check-in', load: () => import('@/pages/happiness/HappinessCheckIn') },
  { name: 'HappinessReview', path: '/happiness/review', load: () => import('@/pages/happiness/HappinessReview') },
  { name: 'HappinessImprove', path: '/happiness/improve', load: () => import('@/pages/happiness/HappinessImprove') },
  { name: 'HappinessWork', path: '/happiness/work', load: () => import('@/pages/happiness/HappinessWork') },
  { name: 'HappinessPrivacy', path: '/happiness/privacy', load: () => import('@/pages/happiness/HappinessPrivacy') }, { name: 'WellbeingInsights', path: '/wellbeing-insights', load: () => import('@/pages/wellbeing/WellbeingInsights') }, { name: 'HumanOutcomeReview', path: '/wellbeing-insights/outcome', load: () => import('@/pages/wellbeing/HumanOutcomeReview') },
  { name: 'TermsOfUse', path: '/terms', load: () => import('@/pages/TermsOfUse') },
  { name: 'Search', path: '/search', load: () => import('@/pages/Search') },
  { name: 'Profile', path: '/profile', load: () => import('@/pages/Profile') },
  { name: 'ContributionsLedger', path: '/profile/contributions', load: () => import('@/pages/profile/ContributionsLedger') },
  { name: 'UserProfile', path: '/u/founder', routePath: '/u/:username', load: () => import('@/pages/UserProfile') },
  { name: 'EndorseSelect', path: '/endorse', load: () => import('@/pages/EndorseSelect') },
  { name: 'EndorseFlow', path: '/endorse/demo', routePath: '/endorse/:userId', load: () => import('@/pages/EndorseFlow') },
  { name: 'Governance', path: '/governance/workspace', load: () => import('@/pages/Governance') },
  { name: 'GovernanceNew', path: '/governance/new', load: () => import('@/pages/GovernanceNew') },
  { name: 'PublicGovernanceLanding', path: '/governance', load: () => import('@/pages/governance/PublicGovernanceLanding') },
  { name: 'CivicVotingHub', path: '/governance/voting', load: () => import('@/pages/governance/CivicVotingHub') },
  { name: 'CivicVotingElection', path: '/governance/voting/e1', routePath: '/governance/voting/:electionId', load: () => import('@/pages/governance/CivicVotingElection') },
  { name: 'CivicVotingObserver', path: '/governance/voting/e1/observe', routePath: '/governance/voting/:electionId/observe', load: () => import('@/pages/governance/CivicVotingObserver') },
  { name: 'SolutionsHub', path: '/governance/solutions', load: () => import('@/pages/governance/SolutionsHub') },
  { name: 'SolutionProblemDetail', path: '/governance/solutions/p1', routePath: '/governance/solutions/:problemId', load: () => import('@/pages/governance/SolutionProblemDetail') },
  { name: 'Study', path: '/study', load: () => import('@/pages/Study') },
  { name: 'StudyLayout', path: '/study/layout', load: () => import('@/pages/StudyLayout') },
  { name: 'StudyCivicLearning', path: '/study/civic', load: () => import('@/pages/study/StudyCivicLearning') },
  { name: 'StudySpecialists', path: '/study/specialists', load: () => import('@/pages/study/StudySpecialists') },
  { name: 'StudyCourses', path: '/study/courses', load: () => import('@/pages/study/StudyCourses') },
  { name: 'StudySchedules', path: '/study/schedules', load: () => import('@/pages/study/StudySchedules') },
  { name: 'StudyMaterials', path: '/study/materials', load: () => import('@/pages/study/StudyMaterials') },
  { name: 'StudyTests', path: '/study/tests', load: () => import('@/pages/study/StudyTests') },
  { name: 'FundHub', path: '/fund', load: () => import('@/pages/fund/FundHub') },
  { name: 'FundSupport', path: '/fund/support', load: () => import('@/pages/fund/FundSupport') },
  { name: 'FundInvest', path: '/fund/invest', load: () => import('@/pages/fund/FundInvest') },
  { name: 'FundInstitutional', path: '/fund/institutional', load: () => import('@/pages/fund/FundInstitutional') },
  { name: 'FundContribute', path: '/fund/contribute', load: () => import('@/pages/fund/FundContribute') },
  { name: 'FundTransparency', path: '/fund/transparency', load: () => import('@/pages/fund/FundTransparency') },
  { name: 'FundProjectFinance', path: '/fund/project-finance', load: () => import('@/pages/fund/FundProjectFinance') },
  { name: 'PublicDocumentsIndex', path: '/documents', load: () => import('@/pages/institutional/PublicDocumentsIndex') },
  { name: 'InstitutionalDocRoute', path: '/documents/legal-status', routePath: '/documents/:slug', load: () => import('@/pages/institutional/InstitutionalDocRoute') },
  { name: 'Pillars', path: '/settings/pillars', load: () => import('@/pages/settings/Pillars') },
  { name: 'Professions', path: '/settings/professions', load: () => import('@/pages/settings/Professions') },
  { name: 'RolesAdmin', path: '/settings/admin/roles', load: () => import('@/pages/settings/RolesAdmin') },
  { name: 'UsersAdmin', path: '/settings/admin/users', load: () => import('@/pages/settings/UsersAdmin') },
  { name: 'PermissionsAdmin', path: '/settings/admin/permissions', load: () => import('@/pages/settings/PermissionsAdmin') },
  { name: 'GovernanceAdmin', path: '/settings/admin/governance', load: () => import('@/pages/settings/GovernanceAdmin') },
  { name: 'LumaCreditsAdmin', path: '/settings/admin/luma', load: () => import('@/pages/settings/LumaCreditsAdmin') },
  { name: 'FundingAdmin', path: '/settings/admin/funding', load: () => import('@/pages/settings/FundingAdmin') },
  { name: 'FundingInterestAdmin', path: '/settings/admin/funding/interest', load: () => import('@/pages/settings/FundingInterestAdmin') },
  { name: 'FundingLedgerAdmin', path: '/settings/admin/funding/ledger', load: () => import('@/pages/settings/FundingLedgerAdmin') },
  { name: 'FundingAuditAdmin', path: '/settings/admin/funding/audit', load: () => import('@/pages/settings/FundingAuditAdmin') },
  { name: 'FundingComplianceAdmin', path: '/settings/admin/funding/compliance', load: () => import('@/pages/settings/FundingComplianceAdmin') },
  { name: 'FundingContributorsAdmin', path: '/settings/admin/funding/contributors', load: () => import('@/pages/settings/FundingContributorsAdmin') },
  { name: 'PrototypeCredits', path: '/settings/prototype-credits', load: () => import('@/pages/settings/PrototypeCredits') },
  { name: 'Taxonomy', path: '/settings/taxonomy', load: () => import('@/pages/settings/Taxonomy') },
  { name: 'MessagingSettings', path: '/settings/messaging', load: () => import('@/pages/settings/MessagingSettings') },
  { name: 'MessagingSecurity', path: '/settings/messaging-security', load: () => import('@/pages/settings/MessagingSecurity') },
  { name: 'PrivacySettings', path: '/settings/privacy', load: () => import('@/pages/settings/PrivacySettings') },
  { name: 'AiAgentSettings', path: '/settings/ai-agent', load: () => import('@/pages/settings/AiAgentSettings') },
  { name: 'SocialAccountsSettings', path: '/settings/social-accounts', load: () => import('@/pages/settings/SocialAccountsSettings') },
];

/**
 * High-risk entry points where missing imports caused boot crashes.
 * Full render catches ReferenceErrors that import-only cannot.
 */
const renderCritical = new Set([
  'Agreements',
  'AgreementCreate',
  'UsersAdmin',
  'RolesAdmin',
  'PermissionsAdmin',
  'GovernanceAdmin',
  'FundingAdmin',
  'Login',
  'SignUp',
  'Home',
  'Market',
  'Profile',
  'ContributionsLedger',
  'Earnings',
  'Happiness',
  'HappinessCheckIn',
  'PrivacySettings',
  'SocialAccountsSettings',
  'PrototypeCredits',
  'PublicGovernanceLanding',
  'Contribute',
  'ProfessionalOpportunities',
  'Matters',
  'OpportunityForm',
  'OpportunityDetail',
  'Areas',
  'AreaDetail',
  'CivicVotingHub',
  'SolutionsHub',
  'NotFound',
]);

async function renderPage(entry: PageEntry) {
  const module = await entry.load();
  const Page = module.default;
  expect(Page).toBeTypeOf('function');

  const routePath = entry.routePath || entry.path;
  const view = render(
    <MemoryRouter initialEntries={[entry.path]}>
      <Suspense fallback={<div>loading</div>}>
        <Routes>
          <Route path={routePath} element={<Page />} />
        </Routes>
      </Suspense>
    </MemoryRouter>,
  );

  view.unmount();
}

describe('page module smoke', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it.each(allPages)('imports $name default export', async ({ load }) => {
    const module = await load();
    expect(module.default).toBeTypeOf('function');
  });

  it.each(allPages.filter((page) => renderCritical.has(page.name)))(
    'renders $name without throwing',
    async (entry) => {
      await expect(renderPage(entry)).resolves.toBeUndefined();
    },
    15_000,
  );
});
