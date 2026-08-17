import type { HistoryTurn } from './types';
import { isScopeRefusal, isVerificationFollowUp, lastSubstantiveUserMessage } from './query-rewrite';

const GREETINGS = ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening'];

const CIVIZEN_TERMS = [
  'civizen',
  'nela',
  'civi',
  'agreement',
  'agreements',
  'contract',
  'sign',
  'contribute',
  'contribution',
  'opportunity',
  'opportunities',
  'challenge',
  'challenges',
  'knowledge space',
  'knowledge gap',
  'learning commons',
  'solution record',
  'program',
  'study',
  'market',
  'marketplace',
  'governance',
  'constitution',
  'charter',
  'tokenomics',
  'vote',
  'voting',
  'election',
  'proposal',
  'profile',
  'score',
  'messaging',
  'message',
  'chat',
  'partner',
  'partnership',
  'area',
  'areas',
  'initiative',
  'pilot',
  'funding',
  'luma',
  'credit',
  'wallet',
  'account',
  'settings',
  'home',
  'how to',
  'how do i',
  'how can i',
  'how can we',
  'how do we',
  'where is',
  'feature',
  'app',
  'peace',
  'war',
  'wars',
  'humanity',
  'citizenship',
  'cooperate',
  'cooperation',
  'coexistence',
];

export function isGreetingOnly(content: string): boolean {
  const c = content.trim().toLowerCase();
  if (!c) return false;
  return GREETINGS.some((g) => c === g);
}

export function textLooksCivizenRelated(content: string): boolean {
  const c = content.trim().toLowerCase();
  if (!c) return false;
  if (isGreetingOnly(c)) return true;
  return CIVIZEN_TERMS.some((t) => c.includes(t));
}

export function isRelevantToCivizen(resolvedQuery: string, messages: HistoryTurn[]): boolean {
  if (textLooksCivizenRelated(resolvedQuery)) return true;

  const latest = [...messages].reverse().find((m) => m.role === 'user');
  const latestText = latest?.content.trim() ?? '';
  if (isGreetingOnly(latestText)) return true;

  if (isVerificationFollowUp(latestText) || isScopeRefusal(latestText) || latestText.length <= 90) {
    const prior = lastSubstantiveUserMessage(messages.filter((m) => m !== latest));
    if (prior && textLooksCivizenRelated(prior.content)) return true;
    const recent = messages.slice(-8);
    if (recent.some((m) => textLooksCivizenRelated(m.content))) return true;
  }

  return false;
}
