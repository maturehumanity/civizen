import {
  SOLUTION_AUTHORITIES,
  type SolutionAuthority,
  getSolutionAuthority,
} from '@/lib/solution-authorities';
import type { SolutionIssueMode } from '@/lib/solutions-constants';

export type { SolutionIssueMode };

export type CategorizeResult = {
  authority: SolutionAuthority;
  confidence: number;
  matchedKeywords: string[];
};

function scoreAuthority(text: string, authority: SolutionAuthority): { score: number; matched: string[] } {
  const matched: string[] = [];
  let score = 0;
  for (const keyword of authority.keywords) {
    const k = keyword.toLowerCase();
    if (!k) continue;
    if (text.includes(k)) {
      matched.push(keyword);
      score += Math.max(1, Math.round(k.split(/\s+/).length));
    }
  }
  return { score, matched };
}

/** Pick the best-matching authority for an issue title+body. */
export function categorizeSolutionIssue(title: string, body: string): CategorizeResult {
  const text = `${title}\n${body}`.toLowerCase();

  let bestAuthority: SolutionAuthority | null = null;
  let bestScore = 0;
  let bestMatched: string[] = [];

  for (const authority of SOLUTION_AUTHORITIES) {
    const { score, matched } = scoreAuthority(text, authority);
    if (score > bestScore) {
      bestScore = score;
      bestAuthority = authority;
      bestMatched = matched;
    }
  }

  if (!bestAuthority || bestScore === 0) {
    if (/\bcivizen\b/.test(text)) {
      const civizen = getSolutionAuthority('civizen_network');
      if (civizen) {
        return { authority: civizen, confidence: 0.4, matchedKeywords: ['civizen'] };
      }
    }
    const municipal = getSolutionAuthority('municipal') ?? SOLUTION_AUTHORITIES[0];
    return { authority: municipal, confidence: 0.3, matchedKeywords: [] };
  }

  return {
    authority: bestAuthority,
    confidence: Math.min(0.95, 0.35 + bestScore * 0.08),
    matchedKeywords: bestMatched,
  };
}
