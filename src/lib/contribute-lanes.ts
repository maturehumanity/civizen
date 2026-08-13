import type { LucideIcon } from 'lucide-react';
import {
  BookOpen,
  Briefcase,
  ClipboardList,
  Globe2,
  HandCoins,
  Handshake,
  Landmark,
  Lightbulb,
  Target,
  TrendingUp,
} from 'lucide-react';

export type ContributeLaneSection = 'ways' | 'community' | 'knowledge' | 'impact';

export type ContributeRelatedLink = {
  path: string;
  labelKey: string;
};

export type ContributeLane = {
  id: string;
  section: ContributeLaneSection;
  path: string;
  icon: LucideIcon;
  iconClassName: string;
  titleKey: string;
  descriptionKey: string;
  /** When true, the path is a Phase 1 placeholder under /contribute/* */
  placeholder: boolean;
  relatedLinks?: readonly ContributeRelatedLink[];
};

/** Placeholder lane path segments (excludes /contribute/policy and live Slice 1 professional). */
export const CONTRIBUTE_PLACEHOLDER_IDS = [
  'projects',
  'tasks',
  'challenges',
  'knowledge',
  'improvements',
  'impact',
] as const;

export type ContributePlaceholderId = (typeof CONTRIBUTE_PLACEHOLDER_IDS)[number];

export const CONTRIBUTE_LANES: readonly ContributeLane[] = [
  {
    id: 'volunteer',
    section: 'ways',
    path: '/fund/contribute',
    icon: Handshake,
    iconClassName: 'text-primary',
    titleKey: 'contribute.lanes.volunteer.title',
    descriptionKey: 'contribute.lanes.volunteer.description',
    placeholder: false,
  },
  {
    id: 'professional',
    section: 'ways',
    path: '/contribute/professional',
    icon: Briefcase,
    iconClassName: 'text-primary',
    titleKey: 'contribute.lanes.professional.title',
    descriptionKey: 'contribute.lanes.professional.description',
    placeholder: false,
    relatedLinks: [
      { path: '/contribute/policy', labelKey: 'contribute.related.policy' },
    ],
  },
  {
    id: 'financial',
    section: 'ways',
    path: '/fund',
    icon: HandCoins,
    iconClassName: 'text-accent',
    titleKey: 'contribute.lanes.financial.title',
    descriptionKey: 'contribute.lanes.financial.description',
    placeholder: false,
  },
  {
    id: 'organization',
    section: 'ways',
    path: '/partners',
    icon: Landmark,
    iconClassName: 'text-accent',
    titleKey: 'contribute.lanes.organization.title',
    descriptionKey: 'contribute.lanes.organization.description',
    placeholder: false,
  },
  {
    id: 'projects',
    section: 'community',
    path: '/contribute/projects',
    icon: Globe2,
    iconClassName: 'text-primary',
    titleKey: 'contribute.lanes.projects.title',
    descriptionKey: 'contribute.lanes.projects.description',
    placeholder: true,
    relatedLinks: [
      { path: '/fund/contribute', labelKey: 'contribute.related.volunteerInterest' },
      { path: '/governance', labelKey: 'contribute.related.governance' },
    ],
  },
  {
    id: 'tasks',
    section: 'community',
    path: '/contribute/tasks',
    icon: ClipboardList,
    iconClassName: 'text-primary',
    titleKey: 'contribute.lanes.tasks.title',
    descriptionKey: 'contribute.lanes.tasks.description',
    placeholder: true,
    relatedLinks: [
      { path: '/fund/contribute', labelKey: 'contribute.related.volunteerInterest' },
    ],
  },
  {
    id: 'challenges',
    section: 'community',
    path: '/contribute/challenges',
    icon: Target,
    iconClassName: 'text-accent',
    titleKey: 'contribute.lanes.challenges.title',
    descriptionKey: 'contribute.lanes.challenges.description',
    placeholder: true,
  },
  {
    id: 'knowledge',
    section: 'knowledge',
    path: '/contribute/knowledge',
    icon: BookOpen,
    iconClassName: 'text-primary',
    titleKey: 'contribute.lanes.knowledge.title',
    descriptionKey: 'contribute.lanes.knowledge.description',
    placeholder: true,
    relatedLinks: [
      { path: '/study', labelKey: 'contribute.related.study' },
    ],
  },
  {
    id: 'improvements',
    section: 'knowledge',
    path: '/contribute/improvements',
    icon: Lightbulb,
    iconClassName: 'text-accent',
    titleKey: 'contribute.lanes.improvements.title',
    descriptionKey: 'contribute.lanes.improvements.description',
    placeholder: true,
    relatedLinks: [
      { path: '/governance/solutions', labelKey: 'contribute.related.solutions' },
      { path: '/governance', labelKey: 'contribute.related.governance' },
    ],
  },
  {
    id: 'impact',
    section: 'impact',
    path: '/contribute/impact',
    icon: TrendingUp,
    iconClassName: 'text-accent',
    titleKey: 'contribute.lanes.impact.title',
    descriptionKey: 'contribute.lanes.impact.description',
    placeholder: true,
    relatedLinks: [
      { path: '/profile', labelKey: 'contribute.related.score' },
    ],
  },
] as const;

export const CONTRIBUTE_SECTION_ORDER: readonly ContributeLaneSection[] = [
  'ways',
  'community',
  'knowledge',
  'impact',
] as const;

export function getContributeLanesBySection(section: ContributeLaneSection): ContributeLane[] {
  return CONTRIBUTE_LANES.filter((lane) => lane.section === section);
}

export function getContributePlaceholderLane(id: string): ContributeLane | undefined {
  return CONTRIBUTE_LANES.find((lane) => lane.placeholder && lane.id === id);
}

export function isContributePlaceholderId(id: string): id is ContributePlaceholderId {
  return (CONTRIBUTE_PLACEHOLDER_IDS as readonly string[]).includes(id);
}
