/**
 * Canonical Draft Budget structure for Civizen Pre-Major-Build Validation Program v0.1.
 * Source: docs/04-operations/funding-and-budget/14-pre-major-build-validation-program-v0.1.md
 *         + 14-validation-workstreams-and-budget-v0.1.csv (+ .meta.json)
 *
 * Base-scenario planned amounts only. Low/high remain in Program Plan.
 * Committed and actual are always 0. Not approved / not published.
 */

export const VALIDATION_BUDGET_V01 = {
  name: 'Civizen Pre-Major-Build Validation Program v0.1',
  version: 1,
  currency: 'USD',
  purpose:
    'Draft working estimates for the 18–24 month pre-major-build validation and institutional-formation program (document 14). Base scenario only. Not an approved budget, bid, commitment, or authorization to accept funds or begin production.',
  internalNotes:
    'Source: docs/04-operations/funding-and-budget/14-pre-major-build-validation-program-v0.1.md and 14-validation-workstreams-and-budget-v0.1.csv. All planned amounts are working estimates (base scenario). Low/high scenarios stay in Program Plan. Do not approve or publish until owner review. Civizen Draft Budget v0.1 demonstration skeleton is retired from ordinary application use.',
  isDemonstration: false,
  lifecycleStatus: 'draft' as const,
  /** Exact sum of CSV base_usd_m × $1M, in USD minor units (cents). */
  plannedTotalMinor: 44_600_000_000,
  plannedTotalUsd: 446_000_000,
} as const;

export type ValidationFundingControlV01 = 'core' | 'independent' | 'grant_pass_through' | 'reserve';

export const VALIDATION_FUNDING_CONTROL_LABELS_V01: Record<ValidationFundingControlV01, string> = {
  core: 'Core-controlled',
  independent: 'Independent review',
  grant_pass_through: 'Grants / pass-through',
  reserve: 'Protected reserve',
};

export type ValidationBudgetGroupV01 = {
  key: string;
  name: string;
  description: string;
  displayOrder: number;
};

/** Intuitive expense groups for WS-01…WS-25. */
export const VALIDATION_BUDGET_GROUPS_V01: readonly ValidationBudgetGroupV01[] = [
  {
    key: 'program_office',
    name: 'Program office & coordination',
    description: 'Core stewardship, public documentation, and international coordination.',
    displayOrder: 10,
  },
  {
    key: 'constitutional_rights_legal',
    name: 'Constitutional, rights & legal formation',
    description: 'Institutional design, anti-capture safeguards, and legal entity formation.',
    displayOrder: 20,
  },
  {
    key: 'inventory_architecture',
    name: 'Inventory, architecture & federation',
    description: 'System-catalog validation, architecture alternatives, and operator-network design.',
    displayOrder: 30,
  },
  {
    key: 'privacy_security_ai',
    name: 'Privacy, security & AI assurance',
    description: 'Privacy/data governance, security research, and AI governance frameworks.',
    displayOrder: 40,
  },
  {
    key: 'identity_econ_standards',
    name: 'Identity, economics, standards & inclusion',
    description: 'Identity interoperability, economic feasibility, standards, and accessibility/localization.',
    displayOrder: 50,
  },
  {
    key: 'studies_consultations',
    name: 'Domain studies & consultations',
    description: 'Commissioned domain studies and jurisdiction/institutional consultations.',
    displayOrder: 60,
  },
  {
    key: 'independent_review',
    name: 'Independent multidisciplinary review',
    description: 'Ring-fenced independent review panels (not unilaterally controlled by the implementer).',
    displayOrder: 70,
  },
  {
    key: 'demos_cost_validation',
    name: 'Demonstrators & cost-model validation',
    description: 'Non-authoritative demonstrators and independent cost-model validation.',
    displayOrder: 80,
  },
  {
    key: 'procurement_controls',
    name: 'Procurement & financial controls',
    description: 'Procurement and multi-entity financial-control systems setup for this phase.',
    displayOrder: 90,
  },
  {
    key: 'grants_civil_society',
    name: 'Grants & civil-society participation',
    description: 'Pass-through grants to research institutions and civil-society participants.',
    displayOrder: 100,
  },
  {
    key: 'contingency',
    name: 'Program contingency',
    description: 'Policy contingency for the validation program (working estimate).',
    displayOrder: 110,
  },
  {
    key: 'safe_pause_reserve',
    name: 'Safe-pause reserve',
    description: 'Validation-phase wind-down and continuity reserve — not the production continuity package.',
    displayOrder: 120,
  },
] as const;

export type ValidationBudgetLineV01 = {
  workstreamId: string;
  groupKey: string;
  name: string;
  purpose: string;
  fundingControl: ValidationFundingControlV01;
  /** Base-scenario planned amount in USD minor units (cents). */
  plannedMinor: number;
  /** Human timing window, e.g. Months 1–24. */
  timingLabel: string;
  durationMonths: number;
  earliestStartMonth: number;
  publicDescription: string;
};

function monthsLabel(start: number, duration: number): string {
  const end = start + duration - 1;
  return start === end ? `Month ${start}` : `Months ${start}–${end}`;
}

function usdMToMinor(usdM: number): number {
  return Math.round(usdM * 1_000_000 * 100);
}

function line(args: {
  workstreamId: string;
  groupKey: string;
  name: string;
  purpose: string;
  fundingControl: ValidationFundingControlV01;
  baseUsdM: number;
  durationMonths: number;
  earliestStartMonth: number;
  publicDescription: string;
}): ValidationBudgetLineV01 {
  return {
    workstreamId: args.workstreamId,
    groupKey: args.groupKey,
    name: args.name,
    purpose: args.purpose,
    fundingControl: args.fundingControl,
    plannedMinor: usdMToMinor(args.baseUsdM),
    timingLabel: monthsLabel(args.earliestStartMonth, args.durationMonths),
    durationMonths: args.durationMonths,
    earliestStartMonth: args.earliestStartMonth,
    publicDescription: args.publicDescription,
  };
}

export const VALIDATION_BUDGET_LINES_V01: readonly ValidationBudgetLineV01[] = [
  line({
    workstreamId: 'WS-01',
    groupKey: 'program_office',
    name: 'Core multidisciplinary program office & stewardship teams',
    purpose: 'Program mgmt, inventory leads, architecture liaison, finance, ops; FTE loaded costs',
    fundingControl: 'core',
    baseUsdM: 28,
    durationMonths: 24,
    earliestStartMonth: 1,
    publicDescription: 'Core program office and stewardship for the validation phase (working estimate).',
  }),
  line({
    workstreamId: 'WS-02',
    groupKey: 'constitutional_rights_legal',
    name: 'Constitutional & institutional design',
    purpose: 'Charters, SoD, temporary→mature governance pathway; counsel',
    fundingControl: 'core',
    baseUsdM: 16,
    durationMonths: 24,
    earliestStartMonth: 1,
    publicDescription: 'Constitutional and institutional design work for validation (working estimate).',
  }),
  line({
    workstreamId: 'WS-03',
    groupKey: 'constitutional_rights_legal',
    name: 'Human-rights & anti-capture safeguards',
    purpose: 'Rights impact assessments; capture scenarios; complaint design',
    fundingControl: 'core',
    baseUsdM: 11,
    durationMonths: 24,
    earliestStartMonth: 1,
    publicDescription: 'Human-rights and anti-capture safeguard design (working estimate).',
  }),
  line({
    workstreamId: 'WS-04',
    groupKey: 'inventory_architecture',
    name: 'System-inventory validation campaign (467 entries)',
    purpose: 'Structured review method; special tracks for operate/never-centralize',
    fundingControl: 'core',
    baseUsdM: 12,
    durationMonths: 18,
    earliestStartMonth: 2,
    publicDescription: 'Validation of the living system catalog (working estimate).',
  }),
  line({
    workstreamId: 'WS-05',
    groupKey: 'inventory_architecture',
    name: 'Architecture alternatives & threat modeling',
    purpose: 'Federation topologies; adversarial models; alternative analyses',
    fundingControl: 'core',
    baseUsdM: 22,
    durationMonths: 20,
    earliestStartMonth: 1,
    publicDescription: 'Architecture alternatives and threat modeling (working estimate).',
  }),
  line({
    workstreamId: 'WS-06',
    groupKey: 'inventory_architecture',
    name: 'Federation & operator-network design validation',
    purpose: '≤10 design-validation operators; independence criteria; no production authority',
    fundingControl: 'core',
    baseUsdM: 15,
    durationMonths: 18,
    earliestStartMonth: 4,
    publicDescription: 'Federation and operator-network design validation (working estimate).',
  }),
  line({
    workstreamId: 'WS-07',
    groupKey: 'privacy_security_ai',
    name: 'Privacy & data-governance design',
    purpose: 'Data classes; cross-border rules; DPIA patterns; minimization',
    fundingControl: 'core',
    baseUsdM: 10,
    durationMonths: 18,
    earliestStartMonth: 2,
    publicDescription: 'Privacy and data-governance design (working estimate).',
  }),
  line({
    workstreamId: 'WS-08',
    groupKey: 'privacy_security_ai',
    name: 'Security & cryptographic research',
    purpose: 'Crypto agility; supply chain; IR drills on demos only',
    fundingControl: 'core',
    baseUsdM: 16,
    durationMonths: 20,
    earliestStartMonth: 2,
    publicDescription: 'Security and cryptographic research for validation (working estimate).',
  }),
  line({
    workstreamId: 'WS-09',
    groupKey: 'privacy_security_ai',
    name: 'AI governance & assurance frameworks',
    purpose: 'Model inventory; HITL; evaluation protocols for Civizen agents',
    fundingControl: 'core',
    baseUsdM: 9,
    durationMonths: 18,
    earliestStartMonth: 3,
    publicDescription: 'AI governance and assurance frameworks (working estimate).',
  }),
  line({
    workstreamId: 'WS-10',
    groupKey: 'identity_econ_standards',
    name: 'Identity & credential interoperability design',
    purpose: 'Interop profiles; no production population binding',
    fundingControl: 'core',
    baseUsdM: 10,
    durationMonths: 18,
    earliestStartMonth: 3,
    publicDescription: 'Identity and credential interoperability design (working estimate).',
  }),
  line({
    workstreamId: 'WS-11',
    groupKey: 'identity_econ_standards',
    name: 'Economic, payments, accounting & taxation feasibility',
    purpose: 'Hooks vs rails; no real-money custody; tax authority boundaries',
    fundingControl: 'core',
    baseUsdM: 12,
    durationMonths: 18,
    earliestStartMonth: 4,
    publicDescription: 'Economic, payments, accounting, and taxation feasibility (working estimate).',
  }),
  line({
    workstreamId: 'WS-12',
    groupKey: 'studies_consultations',
    name: 'Commissioned priority domain studies (10)',
    purpose: 'See doc 15 briefs; published public-interest outputs required',
    fundingControl: 'grant_pass_through',
    baseUsdM: 32,
    durationMonths: 20,
    earliestStartMonth: 3,
    publicDescription: 'Commissioned priority domain studies (working estimate; grant pass-through).',
  }),
  line({
    workstreamId: 'WS-13',
    groupKey: 'studies_consultations',
    name: 'Jurisdiction & institutional consultations',
    purpose: 'Sample legal traditions; MoU prep only; in-kind J time tracked separately',
    fundingControl: 'core',
    baseUsdM: 22,
    // Doc 14 table: M2–M24 (23 inclusive months). CSV had duration 24 → false Months 2–25.
    durationMonths: 23,
    earliestStartMonth: 2,
    publicDescription: 'Jurisdiction and institutional consultations (working estimate).',
  }),
  line({
    workstreamId: 'WS-14',
    groupKey: 'identity_econ_standards',
    name: 'Standards & interoperability planning',
    purpose: 'Conformance suites planning; liaison to SDOs',
    fundingControl: 'core',
    baseUsdM: 8,
    durationMonths: 18,
    earliestStartMonth: 4,
    publicDescription: 'Standards and interoperability planning (working estimate).',
  }),
  line({
    workstreamId: 'WS-15',
    groupKey: 'identity_econ_standards',
    name: 'Accessibility, localization & nondigital inclusion',
    purpose: 'Priority languages; paper/phone/kiosk patterns for demos',
    fundingControl: 'core',
    baseUsdM: 10,
    durationMonths: 20,
    earliestStartMonth: 3,
    publicDescription: 'Accessibility, localization, and nondigital inclusion design (working estimate).',
  }),
  line({
    workstreamId: 'WS-16',
    groupKey: 'independent_review',
    name: 'Independent multidisciplinary review panels (16)',
    purpose: 'Ring-fenced; honoraria; secretariat; minority reports preserved',
    fundingControl: 'independent',
    baseUsdM: 34,
    durationMonths: 24,
    earliestStartMonth: 1,
    publicDescription: 'Independent multidisciplinary review panels (working estimate; independently administered).',
  }),
  line({
    workstreamId: 'WS-17',
    groupKey: 'demos_cost_validation',
    name: 'Controlled non-authoritative demonstrators',
    purpose: 'Synthetic/authorized test data only; safely stoppable; labeled',
    fundingControl: 'core',
    baseUsdM: 24,
    durationMonths: 18,
    earliestStartMonth: 6,
    publicDescription: 'Controlled non-authoritative demonstrators (working estimate).',
  }),
  line({
    workstreamId: 'WS-18',
    groupKey: 'constitutional_rights_legal',
    name: 'Legal entity & organizational formation package',
    purpose: 'Core steward; independent bodies; CoI; whistleblower; procurement rules',
    fundingControl: 'core',
    baseUsdM: 14,
    durationMonths: 24,
    earliestStartMonth: 1,
    publicDescription: 'Legal entity and organizational formation for validation (working estimate).',
  }),
  line({
    workstreamId: 'WS-19',
    groupKey: 'procurement_controls',
    name: 'Procurement & financial-control systems setup',
    purpose: 'Multi-entity ledgers design; not loading civilization figures into app DB',
    fundingControl: 'core',
    baseUsdM: 7,
    durationMonths: 12,
    earliestStartMonth: 1,
    publicDescription: 'Procurement and financial-control systems setup (working estimate).',
  }),
  line({
    workstreamId: 'WS-20',
    groupKey: 'demos_cost_validation',
    name: 'Cost-model validation (RFI/quotes/actuarial/benchmarks)',
    purpose: 'Challenges 11/12/13 hypotheses; publishes confidence bands',
    fundingControl: 'core',
    baseUsdM: 10,
    durationMonths: 18,
    earliestStartMonth: 6,
    publicDescription: 'Cost-model validation via RFI, quotes, and benchmarks (working estimate).',
  }),
  line({
    workstreamId: 'WS-21',
    groupKey: 'program_office',
    name: 'Public documentation & transparency program',
    purpose: 'Public goods packaging; concept summary; open reports',
    fundingControl: 'core',
    baseUsdM: 6,
    durationMonths: 24,
    earliestStartMonth: 1,
    publicDescription: 'Public documentation and transparency program (working estimate).',
  }),
  line({
    workstreamId: 'WS-22',
    groupKey: 'program_office',
    name: 'Travel & international coordination',
    purpose: 'Hybrid-first; equity travel fund for Global South participants',
    fundingControl: 'core',
    baseUsdM: 10,
    durationMonths: 24,
    earliestStartMonth: 1,
    publicDescription: 'Travel and international coordination for validation (working estimate).',
  }),
  line({
    workstreamId: 'WS-23',
    groupKey: 'grants_civil_society',
    name: 'Grants to research institutions & civil-society participants',
    purpose: 'Inclusion; community validation; not core P&L spend',
    fundingControl: 'grant_pass_through',
    baseUsdM: 26,
    // Doc 14 table: M2–M24 (23 inclusive months). CSV had duration 24 → false Months 2–25.
    durationMonths: 23,
    earliestStartMonth: 2,
    publicDescription: 'Grants to research and civil-society participants (working estimate; pass-through).',
  }),
  line({
    workstreamId: 'WS-24',
    groupKey: 'contingency',
    name: 'Program contingency (policy)',
    purpose: '~15–18% of workstreams WS-01..WS-23; drawdown rules',
    fundingControl: 'core',
    baseUsdM: 40,
    durationMonths: 24,
    earliestStartMonth: 1,
    publicDescription: 'Validation program contingency (working estimate).',
  }),
  line({
    workstreamId: 'WS-25',
    groupKey: 'safe_pause_reserve',
    name: 'Safe-pause & validation-program continuity reserve',
    purpose: 'Wind-down, publish, archive, transfer; NOT the $2–4B production continuity package',
    fundingControl: 'reserve',
    baseUsdM: 42,
    durationMonths: 24,
    earliestStartMonth: 1,
    publicDescription: 'Safe-pause reserve for the validation phase only (working estimate).',
  }),
] as const;

export function validationLineTitle(line: ValidationBudgetLineV01): string {
  return `${line.workstreamId} · ${line.name}`;
}

export function validationLineDescription(line: ValidationBudgetLineV01): string {
  const funding = VALIDATION_FUNDING_CONTROL_LABELS_V01[line.fundingControl];
  return [
    `Working estimate (base scenario).`,
    `Purpose: ${line.purpose}`,
    `Funding responsibility: ${funding} (${line.fundingControl}).`,
    `Source workstream ${line.workstreamId} from document 14.`,
  ].join(' ');
}

export function validationLinePeriodLabel(line: ValidationBudgetLineV01): string {
  return `${line.timingLabel} · working estimate`;
}

export function summarizeValidationBudgetV01() {
  const plannedMinor = VALIDATION_BUDGET_LINES_V01.reduce((acc, l) => acc + l.plannedMinor, 0);
  const byGroup = new Map<string, number>();
  const byFunding = new Map<ValidationFundingControlV01, number>();
  for (const l of VALIDATION_BUDGET_LINES_V01) {
    byGroup.set(l.groupKey, (byGroup.get(l.groupKey) ?? 0) + l.plannedMinor);
    byFunding.set(l.fundingControl, (byFunding.get(l.fundingControl) ?? 0) + l.plannedMinor);
  }
  return {
    lineCount: VALIDATION_BUDGET_LINES_V01.length,
    groupCount: VALIDATION_BUDGET_GROUPS_V01.length,
    plannedMinor,
    plannedUsd: plannedMinor / 100,
    byGroup,
    byFunding,
  };
}
