import type { HistoryTurn, TerminologyAlias } from './types';

const VERIFICATION_PATTERNS = [
  /^\s*are you sure\b/i,
  /^\s*check again\b/i,
  /^\s*where did you get that\b/i,
  /^\s*is that (true|correct|right|accurate)\b/i,
  /^\s*really\??\s*$/i,
  /^\s*verify( that)?\b/i,
  /^\s*didn['’]?t we implement\b/i,
  /^\s*i think we have that\b/i,
  /^\s*what about the feature we added\b/i,
  /^\s*can you (double[- ]?check|confirm|verify)\b/i,
  /^\s*positive\??\s*$/i,
  /^\s*(are you )?positive\??\s*$/i,
  /^\s*you sure\??\s*$/i,
  /^\s*confirm\??\s*$/i,
  /^\s*certain\??\s*$/i,
  /^\s*definitely\??\s*$/i,
  /^\s*absolutely\??\s*$/i,
];

const SHORT_FOLLOWUP_MAX = 90;

export function isVerificationFollowUp(content: string): boolean {
  const c = content.trim();
  if (!c) return false;
  return VERIFICATION_PATTERNS.some((re) => re.test(c));
}

export function isScopeRefusal(content: string): boolean {
  const c = content.trim().toLowerCase();
  return c.includes('i can only help with civizen-related topics');
}

export function lastTurn(messages: HistoryTurn[], role: HistoryTurn['role']): HistoryTurn | null {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i].role === role && messages[i].content.trim()) return messages[i];
  }
  return null;
}

export function lastSubstantiveUserMessage(messages: HistoryTurn[]): HistoryTurn | null {
  const latest = messages.filter((m) => m.role === 'user' && m.content.trim());
  for (let i = latest.length - 1; i >= 0; i -= 1) {
    const text = latest[i].content.trim();
    if (isVerificationFollowUp(text)) continue;
    if (text.length <= 1) continue;
    return latest[i];
  }
  return latest[latest.length - 1] ?? null;
}

export function lastSubstantiveAssistantMessage(messages: HistoryTurn[]): HistoryTurn | null {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const m = messages[i];
    if (m.role !== 'assistant') continue;
    const text = m.content.trim();
    if (!text) continue;
    if (isScopeRefusal(text)) continue;
    if (text.toLowerCase().includes('could not generate a reply')) continue;
    return m;
  }
  return null;
}

function applyAliases(query: string, aliases: TerminologyAlias[]): string {
  let next = query;
  for (const entry of aliases) {
    for (const alias of entry.aliases) {
      const re = new RegExp(`\\b${escapeRegExp(alias)}\\b`, 'ig');
      if (re.test(next) && !next.toLowerCase().includes(entry.current.toLowerCase())) {
        next = `${next} ${entry.current}`;
      }
    }
  }
  return next;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function resolveConversationalQuery(
  messages: HistoryTurn[],
  aliases: TerminologyAlias[] = [],
): {
  resolvedQuery: string;
  isVerification: boolean;
  previousUserQuestion: string | null;
  previousAssistantClaim: string | null;
} {
  const latest = lastTurn(messages, 'user');
  const latestText = latest?.content.trim() ?? '';
  const previousUser = lastSubstantiveUserMessage(messages.filter((m) => m !== latest));
  const previousAssistant = lastSubstantiveAssistantMessage(messages);
  const previousUserQuestion = previousUser?.content.trim() ?? null;
  const previousAssistantClaim = previousAssistant?.content.trim() ?? null;

  if (!latestText) {
    return {
      resolvedQuery: previousUserQuestion ?? '',
      isVerification: false,
      previousUserQuestion,
      previousAssistantClaim,
    };
  }

  const verification = isVerificationFollowUp(latestText);
  if (verification) {
    const original = previousUserQuestion || 'the previous Civizen question';
    const claim = previousAssistantClaim || 'the previous answer';
    const resolvedQuery = applyAliases(
      `Verify the previous Civizen answer. Original question: ${original} Previous answer: ${claim} Follow-up: ${latestText}`,
      aliases,
    );
    return { resolvedQuery, isVerification: true, previousUserQuestion, previousAssistantClaim };
  }

  const shortFollowUp =
    latestText.length <= SHORT_FOLLOWUP_MAX &&
    Boolean(previousUserQuestion) &&
    /\b(it|one|that|this|they|them|those|there)\b/i.test(latestText);

  const combined = shortFollowUp
    ? `${latestText} (about: ${previousUserQuestion})`
    : latestText;

  return {
    resolvedQuery: applyAliases(combined, aliases),
    isVerification: false,
    previousUserQuestion,
    previousAssistantClaim,
  };
}
