import { supabase } from '@/integrations/supabase/client';
import type { HistoryTurn } from '@/lib/assistant/types';

export const CIVI_PUBLIC_HISTORY_LIMIT = 12;
export const CIVI_PUBLIC_MESSAGE_MAX = 2000;

export function sanitizeCiviPublicHistory(history: HistoryTurn[]): HistoryTurn[] {
  return history
    .filter((turn) => (turn.role === 'user' || turn.role === 'assistant') && typeof turn.content === 'string')
    .map((turn) => ({
      role: turn.role,
      content: turn.content.trim().slice(0, CIVI_PUBLIC_MESSAGE_MAX),
    }))
    .filter((turn) => turn.content.length > 0)
    .slice(-CIVI_PUBLIC_HISTORY_LIMIT);
}

export async function askCiviPublic(message: string, history: HistoryTurn[] = []): Promise<string> {
  const trimmed = message.trim().slice(0, CIVI_PUBLIC_MESSAGE_MAX);
  if (!trimmed) return '';

  const safeHistory = sanitizeCiviPublicHistory(history);
  const { data, error } = await supabase.functions.invoke('messaging-agent-reply', {
    body: {
      public: true,
      message: trimmed,
      history: safeHistory,
    },
  });

  const reply = typeof data?.reply === 'string' ? data.reply.trim() : '';
  if (!error && reply) return reply;

  const { prepareNelaTurn } = await import('@/lib/assistant/orchestrator');
  const prep = prepareNelaTurn([...safeHistory, { role: 'user', content: trimmed }], { audience: 'guest' });
  return prep.groundedAnswer;
}
