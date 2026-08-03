/** Stable profile ids for Solutions council agents (matches DB migration). */
export const CHATGPT_AGENT_PROFILE_ID = 'a0000000-0000-4000-8000-000000000002';
export const GEMINI_AGENT_PROFILE_ID = 'a0000000-0000-4000-8000-000000000003';
export const CLAUDE_AGENT_PROFILE_ID = 'a0000000-0000-4000-8000-000000000004';

export type SolutionAgentSpeaker = 'chatgpt' | 'gemini' | 'claude';
export type SolutionSpeaker = 'citizen' | SolutionAgentSpeaker;

export type SolutionProblemStatus =
  | 'open'
  | 'debating'
  | 'consensus'
  | 'split'
  | 'closed'
  | 'categorizing'
  | 'routed'
  | 'seeking_professional'
  | 'accepted'
  | 'in_progress'
  | 'resolved';

export type SolutionIssueMode = 'discuss' | 'solve';

export type SolutionStanceAction = 'propose' | 'revise' | 'agree' | 'dissent';

export type SolutionTurnStance = {
  action?: SolutionStanceAction;
  proposal_title?: string;
  proposal_summary?: string;
  agrees_with_speaker?: SolutionAgentSpeaker | null;
  dissent_reason?: string | null;
};

export type SolutionProposalSource = 'consensus' | SolutionAgentSpeaker | 'coalition';

export const SOLUTION_AGENT_ORDER: readonly SolutionAgentSpeaker[] = [
  'chatgpt',
  'gemini',
  'claude',
] as const;

export const SOLUTION_AGENT_PROFILE_IDS: Record<SolutionAgentSpeaker, string> = {
  chatgpt: CHATGPT_AGENT_PROFILE_ID,
  gemini: GEMINI_AGENT_PROFILE_ID,
  claude: CLAUDE_AGENT_PROFILE_ID,
};

const base = import.meta.env.BASE_URL;

export const SOLUTION_AGENT_AVATAR_URLS: Record<SolutionAgentSpeaker, string> = {
  chatgpt: `${base}avatars/chatgpt.svg`,
  gemini: `${base}avatars/gemini.svg`,
  claude: `${base}avatars/claude.svg`,
};

export const SOLUTION_AGENT_DISPLAY_NAMES: Record<SolutionAgentSpeaker, string> = {
  chatgpt: 'ChatGPT',
  gemini: 'Gemini',
  claude: 'Claude',
};

export function isSolutionAgentSpeaker(value: string): value is SolutionAgentSpeaker {
  return value === 'chatgpt' || value === 'gemini' || value === 'claude';
}

export function resolveSolutionAgentAvatarUrl(speaker: SolutionSpeaker): string | undefined {
  if (speaker === 'citizen') return undefined;
  return SOLUTION_AGENT_AVATAR_URLS[speaker];
}
