/**
 * Canonical structure for Civizen Draft Budget v0.1 (planning skeleton).
 * Planned/committed/actual monetary values are intentionally zero until the
 * project owner confirms planning estimates. See:
 * docs/04-operations/funding-and-budget/06-initial-working-budget-v0.1.md
 */

export const INITIAL_BUDGET_V01 = {
  name: 'Civizen Draft Budget v0.1',
  version: 1,
  currency: 'USD',
  purpose:
    'Internal demonstration planning skeleton only. Phase 1–3 labels are conceptual placeholders (Timing TBD), not calendar schedules and not the validation Months 1–24 or five-year Years 1–5 Program plan. Amounts remain zero until an approved operational budget replaces or formally remaps this skeleton.',
  internalNotes:
    'Source: docs/04-operations/funding-and-budget/06-initial-working-budget-v0.1.md. Currency USD is a planning-display assumption pending owner confirmation. is_demonstration=true until amounts are owner-confirmed. Do not approve or publish until estimates are reviewed.',
  isDemonstration: true,
  lifecycleStatus: 'draft' as const,
} as const;

export const BUDGET_PHASES_V01 = [
  {
    id: 'phase1',
    label: 'Phase 1 — Foundation and working prototype',
    outcome:
      'Credible public identity, working platform continuity, governance/finance documentation, and inquiry-only funding surfaces.',
    timingNote:
      'Conceptual placeholder only — Timing TBD. Not a calendar period and not the 18–24-month validation program or Years 1–5 first-wave plan.',
  },
  {
    id: 'phase2',
    label: 'Phase 2 — Security hardening and limited pilot',
    outcome:
      'Hardened security/privacy posture, measurable pilot with a scoped partner or community, and evidence suitable for targeted funding conversations.',
    timingNote:
      'Conceptual placeholder only — Timing TBD. Not a calendar period and not the validation or five-year program horizons.',
  },
  {
    id: 'phase3',
    label: 'Phase 3 — Production readiness and institutional integration',
    outcome:
      'Counsel-ready receiving-entity posture, operational reporting, and capacity for institutional partnerships without implying those partnerships are funded.',
    timingNote:
      'Conceptual placeholder only — Timing TBD. Not a calendar period and not mapped to Program plan Months 1–24 or Years 1–5.',
  },
  {
    id: 'annual',
    label: 'Ongoing annual operations',
    outcome:
      'Steady-state hosting, tooling, communications, light legal/accounting retainers, and contingency for continuity after foundation work.',
    timingNote: 'Conceptual recurring bucket — Timing TBD until an approved operational budget defines periods.',
  },
] as const;

export type BudgetCostClassV01 = 'one_time' | 'recurring' | 'personnel_or_service' | 'infrastructure_or_vendor' | 'reserve';

export type InitialBudgetLineV01 = {
  groupKey: string;
  title: string;
  description: string;
  publicDescription: string;
  /** Always 0 in v0.1 — TBD until owner-confirmed estimates exist. */
  plannedMinor: 0;
  committedMinor: 0;
  actualMinor: 0;
  currency: 'USD';
  phaseId: (typeof BUDGET_PHASES_V01)[number]['id'];
  costClass: BudgetCostClassV01;
  periodLabel: string;
  publishFlag: false;
};

export type InitialBudgetGroupV01 = {
  key: string;
  name: string;
  description: string;
  displayOrder: number;
};

export const INITIAL_BUDGET_GROUPS_V01: readonly InitialBudgetGroupV01[] = [
  {
    key: 'product_engineering',
    name: 'Product and engineering',
    description: 'Application development, quality, release continuity, and technical delivery.',
    displayOrder: 10,
  },
  {
    key: 'design_accessibility',
    name: 'Design and accessibility',
    description: 'UX/UI refinement, accessibility review, and public-surface clarity.',
    displayOrder: 20,
  },
  {
    key: 'security_privacy',
    name: 'Security, privacy, auditing, and resilience',
    description: 'Hardening, reviews, incident readiness, and privacy-preserving operations.',
    displayOrder: 30,
  },
  {
    key: 'infrastructure_tools',
    name: 'Infrastructure and development tools',
    description: 'Hosting, database, CI, DNS/edge, and developer tooling already implied by the stack.',
    displayOrder: 40,
  },
  {
    key: 'legal_governance',
    name: 'Legal, governance, accounting, and compliance preparation',
    description: 'Entity readiness, counsel, accounting setup, and compliance foundations (not capital acceptance).',
    displayOrder: 50,
  },
  {
    key: 'research_pilots',
    name: 'Research, testing, and pilots',
    description: 'Evaluation, limited pilots, and evidence gathering for adoption and funding conversations.',
    displayOrder: 60,
  },
  {
    key: 'operations',
    name: 'Project and organizational operations',
    description: 'Day-to-day coordination, administration, and founder-led operating capacity.',
    displayOrder: 70,
  },
  {
    key: 'partnerships_comms',
    name: 'Partnerships, communications, and funding outreach',
    description: 'Public messaging, institutional conversations, and targeted outreach (not broad fundraising campaigns).',
    displayOrder: 80,
  },
  {
    key: 'contingency',
    name: 'Contingency',
    description: 'Planning reserve for unknowns; not allocated spending.',
    displayOrder: 90,
  },
] as const;

function line(
  partial: Omit<InitialBudgetLineV01, 'plannedMinor' | 'committedMinor' | 'actualMinor' | 'currency' | 'publishFlag'>,
): InitialBudgetLineV01 {
  return {
    ...partial,
    plannedMinor: 0,
    committedMinor: 0,
    actualMinor: 0,
    currency: 'USD',
    publishFlag: false,
  };
}

export const INITIAL_BUDGET_LINES_V01: readonly InitialBudgetLineV01[] = [
  // Product and engineering
  line({
    groupKey: 'product_engineering',
    title: 'Core platform engineering (Phase 1)',
    description:
      'Planning estimate TBD — engineering capacity to maintain and extend the working Civizen platform during foundation/prototype continuity. Basis: active development evidenced in repo; no contracted rate on file.',
    publicDescription: 'Product engineering for the working Civizen platform (planning amount TBD).',
    phaseId: 'phase1',
    costClass: 'personnel_or_service',
    periodLabel: 'Conceptual Phase 1 · Timing TBD · personnel_or_service',
  }),
  line({
    groupKey: 'product_engineering',
    title: 'Core platform engineering (Phase 2)',
    description:
      'Planning estimate TBD — engineering for pilot-ready features and hardening support. No staffing contracts documented in-repo.',
    publicDescription: 'Engineering support for limited pilot readiness (planning amount TBD).',
    phaseId: 'phase2',
    costClass: 'personnel_or_service',
    periodLabel: 'Conceptual Phase 2 · Timing TBD · personnel_or_service',
  }),
  line({
    groupKey: 'product_engineering',
    title: 'Core platform engineering (Phase 3)',
    description:
      'Planning estimate TBD — engineering for production readiness and institutional integration work. Not funded.',
    publicDescription: 'Engineering for production-readiness work (planning amount TBD).',
    phaseId: 'phase3',
    costClass: 'personnel_or_service',
    periodLabel: 'Conceptual Phase 3 · Timing TBD · personnel_or_service',
  }),
  line({
    groupKey: 'product_engineering',
    title: 'Automated test and release quality capacity',
    description:
      'Planning estimate TBD — sustained Vitest/CI/release verification capacity. Repo has verify:ci and Vitest; no separate vendor quote.',
    publicDescription: 'Quality and release verification capacity (planning amount TBD).',
    phaseId: 'phase1',
    costClass: 'one_time',
    periodLabel: 'Conceptual Phase 1 · Timing TBD · one_time',
  }),

  // Design and accessibility
  line({
    groupKey: 'design_accessibility',
    title: 'UX/UI and accessibility review (Phase 1–2)',
    description:
      'Planning estimate TBD — accessibility and UX polish for public and member surfaces. No agency quote in-repo.',
    publicDescription: 'Design and accessibility improvements (planning amount TBD).',
    phaseId: 'phase2',
    costClass: 'personnel_or_service',
    periodLabel: 'Conceptual Phase 2 · Timing TBD · personnel_or_service',
  }),

  // Security
  line({
    groupKey: 'security_privacy',
    title: 'Security hardening sprint',
    description:
      'Planning estimate TBD — focused hardening before limited pilot. No third-party audit quote in-repo.',
    publicDescription: 'Security hardening before limited pilot (planning amount TBD).',
    phaseId: 'phase2',
    costClass: 'one_time',
    periodLabel: 'Conceptual Phase 2 · Timing TBD · one_time',
  }),
  line({
    groupKey: 'security_privacy',
    title: 'Independent security / privacy review',
    description:
      'Planning estimate TBD — external review when pilot or institutional partners require it. No vendor selected.',
    publicDescription: 'Independent security or privacy review (planning amount TBD).',
    phaseId: 'phase3',
    costClass: 'one_time',
    periodLabel: 'Conceptual Phase 3 · Timing TBD · one_time',
  }),
  line({
    groupKey: 'security_privacy',
    title: 'Ongoing security monitoring and incident readiness',
    description:
      'Planning estimate TBD — annual monitoring/retainer capacity. Recurring; not a live contract.',
    publicDescription: 'Ongoing security monitoring capacity (planning amount TBD).',
    phaseId: 'annual',
    costClass: 'recurring',
    periodLabel: 'Conceptual annual · Timing TBD · recurring',
  }),

  // Infrastructure
  line({
    groupKey: 'infrastructure_tools',
    title: 'Application hosting and database (annual)',
    description:
      'Planning estimate TBD — VPS/nginx production host and Supabase-managed database/auth implied by ops docs and stack. No invoice amounts in public repo.',
    publicDescription: 'Hosting and managed database operations (planning amount TBD).',
    phaseId: 'annual',
    costClass: 'infrastructure_or_vendor',
    periodLabel: 'Conceptual annual · Timing TBD · infrastructure_or_vendor',
  }),
  line({
    groupKey: 'infrastructure_tools',
    title: 'DNS, edge, and CI tooling (annual)',
    description:
      'Planning estimate TBD — Cloudflare DNS/edge keys and GitHub Actions CI referenced in ops docs. Plan tier unknown.',
    publicDescription: 'DNS/edge and continuous integration tooling (planning amount TBD).',
    phaseId: 'annual',
    costClass: 'infrastructure_or_vendor',
    periodLabel: 'Conceptual annual · Timing TBD · infrastructure_or_vendor',
  }),
  line({
    groupKey: 'infrastructure_tools',
    title: 'AI model/API usage for in-app agents',
    description:
      'Planning estimate TBD — OpenAI / Gemini / Anthropic usage implied by solutions-council and messaging agent docs. Usage-based; no spend history published in-repo.',
    publicDescription: 'AI API usage for product features (planning amount TBD).',
    phaseId: 'annual',
    costClass: 'infrastructure_or_vendor',
    periodLabel: 'Conceptual annual · Timing TBD · infrastructure_or_vendor',
  }),
  line({
    groupKey: 'infrastructure_tools',
    title: 'Environment bootstrap and staging capacity',
    description:
      'Planning estimate TBD — one-time staging/isolation improvements aligned with ENVIRONMENT_LIFECYCLE. No vendor quote.',
    publicDescription: 'Staging and environment bootstrap (planning amount TBD).',
    phaseId: 'phase1',
    costClass: 'one_time',
    periodLabel: 'Conceptual Phase 1 · Timing TBD · one_time',
  }),

  // Legal
  line({
    groupKey: 'legal_governance',
    title: 'Legal entity and counsel engagement',
    description:
      'Planning estimate TBD — receiving-entity architecture remains an open legal question (open-legal-questions.md). Not an accepted counsel engagement.',
    publicDescription: 'Legal entity and counsel preparation (planning amount TBD).',
    phaseId: 'phase3',
    costClass: 'personnel_or_service',
    periodLabel: 'Conceptual Phase 3 · Timing TBD · personnel_or_service',
  }),
  line({
    groupKey: 'legal_governance',
    title: 'Accounting setup and bookkeeping readiness',
    description:
      'Planning estimate TBD — software ledger ≠ legal books (funding integrity policy). No accountant engaged in-repo.',
    publicDescription: 'Accounting and bookkeeping readiness (planning amount TBD).',
    phaseId: 'phase3',
    costClass: 'personnel_or_service',
    periodLabel: 'Conceptual Phase 3 · Timing TBD · personnel_or_service',
  }),
  line({
    groupKey: 'legal_governance',
    title: 'Compliance preparation (KYC/AML outline readiness)',
    description:
      'Planning estimate TBD — policy outline exists; live providers gated. Preparation only, not provider fees.',
    publicDescription: 'Compliance preparation work (planning amount TBD).',
    phaseId: 'phase3',
    costClass: 'one_time',
    periodLabel: 'Conceptual Phase 3 · Timing TBD · one_time',
  }),

  // Research / pilots
  line({
    groupKey: 'research_pilots',
    title: 'Limited pilot facilitation (Phase 2)',
    description:
      'Planning estimate TBD — scoped pilot facilitation per funding-readiness Stage 3. No partner or pilot budget locked.',
    publicDescription: 'Limited pilot facilitation (planning amount TBD).',
    phaseId: 'phase2',
    costClass: 'one_time',
    periodLabel: 'Conceptual Phase 2 · Timing TBD · one_time',
  }),
  line({
    groupKey: 'research_pilots',
    title: 'Evaluation and research partnership support',
    description:
      'Planning estimate TBD — university/NGO evaluation capacity. No MoU or award in-repo.',
    publicDescription: 'Research and evaluation support (planning amount TBD).',
    phaseId: 'phase2',
    costClass: 'personnel_or_service',
    periodLabel: 'Conceptual Phase 2 · Timing TBD · personnel_or_service',
  }),

  // Operations
  line({
    groupKey: 'operations',
    title: 'Project coordination and administration (annual)',
    description:
      'Planning estimate TBD — founder-led coordination capacity. Not a payroll commitment.',
    publicDescription: 'Project coordination and administration (planning amount TBD).',
    phaseId: 'annual',
    costClass: 'personnel_or_service',
    periodLabel: 'Conceptual annual · Timing TBD · personnel_or_service',
  }),
  line({
    groupKey: 'operations',
    title: 'Administrative tooling and productivity software (annual)',
    description:
      'Planning estimate TBD — generic ops tooling. No SaaS spend register in-repo.',
    publicDescription: 'Administrative tooling (planning amount TBD).',
    phaseId: 'annual',
    costClass: 'recurring',
    periodLabel: 'Conceptual annual · Timing TBD · recurring',
  }),

  // Partnerships / comms
  line({
    groupKey: 'partnerships_comms',
    title: 'Public documentation and messaging capacity',
    description:
      'Planning estimate TBD — documentation/messaging aligned with funding readiness Stages 1–2. No agency retainers documented.',
    publicDescription: 'Public documentation and messaging (planning amount TBD).',
    phaseId: 'phase1',
    costClass: 'personnel_or_service',
    periodLabel: 'Conceptual Phase 1 · Timing TBD · personnel_or_service',
  }),
  line({
    groupKey: 'partnerships_comms',
    title: 'Targeted institutional outreach (Phase 2–3)',
    description:
      'Planning estimate TBD — selective conversations after pilot readiness; not indiscriminate fundraising. No campaign budget.',
    publicDescription: 'Targeted institutional outreach (planning amount TBD).',
    phaseId: 'phase3',
    costClass: 'one_time',
    periodLabel: 'Conceptual Phase 3 · Timing TBD · one_time',
  }),

  // Contingency
  line({
    groupKey: 'contingency',
    title: 'Planning contingency reserve',
    description:
      'Planning estimate TBD — reserve percentage/amount to be set by owner once base estimates exist. Not spent funds.',
    publicDescription: 'Contingency reserve (planning amount TBD).',
    phaseId: 'annual',
    costClass: 'reserve',
    periodLabel: 'Conceptual annual · Timing TBD · reserve',
  }),
];

export function summarizeInitialBudgetV01() {
  const byPhase: Record<string, number> = {};
  const byCostClass: Record<string, number> = {};
  const byGroup: Record<string, number> = {};
  let planned = 0;
  let committed = 0;
  let actual = 0;

  for (const lineItem of INITIAL_BUDGET_LINES_V01) {
    planned += lineItem.plannedMinor;
    committed += lineItem.committedMinor;
    actual += lineItem.actualMinor;
    byPhase[lineItem.phaseId] = (byPhase[lineItem.phaseId] ?? 0) + lineItem.plannedMinor;
    byCostClass[lineItem.costClass] = (byCostClass[lineItem.costClass] ?? 0) + lineItem.plannedMinor;
    byGroup[lineItem.groupKey] = (byGroup[lineItem.groupKey] ?? 0) + lineItem.plannedMinor;
  }

  return {
    currency: INITIAL_BUDGET_V01.currency,
    lineCount: INITIAL_BUDGET_LINES_V01.length,
    groupCount: INITIAL_BUDGET_GROUPS_V01.length,
    plannedMinor: planned,
    committedMinor: committed,
    actualMinor: actual,
    byPhase,
    byCostClass,
    byGroup,
    amountsAreTbd: planned === 0 && committed === 0 && actual === 0,
  };
}
