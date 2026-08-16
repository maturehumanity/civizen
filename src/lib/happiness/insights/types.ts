import type { HappinessDomainId } from '@/lib/happiness/types';
import type {
  AggregateSuppressedResult,
  AggregateTimeBucket,
  ParticipationBand,
  QualifyingScope,
  SystemicIssueCandidate,
  SystemicIssueStatus,
} from '@/lib/happiness/aggregate/types';

export type InsightPolarity = 'going_well' | 'needs_attention' | 'mixed';
export type InsightTrend = 'improving' | 'stable' | 'declining' | 'unknown';
export type InsightProblemKind = 'individual_support' | 'institutional_condition' | 'community_system' | 'unclear';

export type PresentedDomainInsight = {
  domain: HappinessDomainId;
  polarity: InsightPolarity;
  trend: InsightTrend;
  summary: string;
  sufficiency: ParticipationBand | 'unavailable';
  factors: string[];
  helpfulness: string | null;
  problemKind: InsightProblemKind;
  caveats: string[];
  periodStart: string;
  timeBucket: AggregateTimeBucket;
};

export type PresentedOverview = {
  scope: QualifyingScope | null;
  goingWell: PresentedDomainInsight[];
  needsAttention: PresentedDomainInsight[];
  emerging: SystemicIssueCandidate[];
  established: SystemicIssueCandidate[];
  monitoring: SystemicIssueCandidate[];
  movement: PresentedDomainInsight[];
  suppressed: AggregateSuppressedResult | null;
  scopeDisabled: boolean;
  unauthorized: boolean;
};

export type InsightActionType =
  | 'monitor'
  | 'investigate'
  | 'link_existing'
  | 'challenge_draft'
  | 'governance_draft'
  | 'contribute_evidence';

export type InsightLinkEntity = 'challenge' | 'governance_solution' | 'knowledge_space' | 'solution_record';

export type ExistingEffort = {
  entityType: InsightLinkEntity;
  entityId: string;
  title: string;
  path: string;
};

export type WellbeingHandoff = {
  source: 'wellbeing_insights';
  title: string;
  problemStatement: string;
  whyItMatters: string;
  evidenceLinks: string;
  contextDetail: string;
  successCriteria: string;
  autoPublish: false;
};

export type StoredSystemicCandidate = SystemicIssueCandidate & { id: string };

export type { SystemicIssueCandidate, SystemicIssueStatus };
