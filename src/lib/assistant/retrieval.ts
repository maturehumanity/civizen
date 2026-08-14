import type {
  AssistantCapability,
  AssistantFaqItem,
  KnowledgeChunk,
  KnowledgePack,
  RetrievedCapabilityHit,
  RetrievedChunkHit,
  RetrievedFaqHit,
  RetrievalResult,
} from './types';

const STOP = new Set([
  'a', 'an', 'the', 'and', 'or', 'to', 'of', 'in', 'on', 'for', 'is', 'are', 'was', 'be',
  'this', 'that', 'with', 'from', 'as', 'at', 'by', 'it', 'its', 'you', 'your', 'we',
  'can', 'how', 'what', 'who', 'where', 'when', 'do', 'does', 'did', 'i', 'me', 'my',
]);

const PRIORITY_WEIGHT: Record<number, number> = {
  1: 1.15,
  2: 1.08,
  3: 1.04,
  4: 1.1,
  5: 1,
  6: 0.72,
  7: 0.42,
};

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9+/.-]+/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOP.has(t));
}

function termFreq(tokens: string[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const t of tokens) map.set(t, (map.get(t) ?? 0) + 1);
  return map;
}

function bm25Score(queryTokens: string[], docTokens: string[], avgLen: number): number {
  if (!queryTokens.length || !docTokens.length) return 0;
  const tf = termFreq(docTokens);
  const k1 = 1.2;
  const b = 0.75;
  const len = docTokens.length;
  let score = 0;
  const unique = [...new Set(queryTokens)];
  for (const term of unique) {
    const f = tf.get(term) ?? 0;
    if (!f) continue;
    const idf = 1.4;
    score += idf * ((f * (k1 + 1)) / (f + k1 * (1 - b + b * (len / Math.max(avgLen, 1)))));
  }
  return score;
}

function faqHaystack(item: AssistantFaqItem): string {
  return `${item.question} ${item.aliases.join(' ')} ${item.answer}`;
}

function capabilityHaystack(item: AssistantCapability): string {
  return `${item.name} ${item.aliases.join(' ')} ${item.description} ${item.howTo ?? ''} ${item.routes.join(' ')}`;
}

function distinctiveOverlap(query: string, text: string): number {
  const generic = new Set(['civizen', 'nela', 'app', 'feature', 'platform', 'member', 'members']);
  const qTerms = tokenize(query).filter((t) => !generic.has(t));
  if (!qTerms.length) return 1;
  const hay = new Set(tokenize(text));
  return qTerms.filter((t) => hay.has(t)).length / qTerms.length;
}

export function searchFaq(query: string, faq: AssistantFaqItem[], limit = 3): RetrievedFaqHit[] {
  const q = query.toLowerCase();
  const qTokens = tokenize(query);
  const avg = faq.reduce((s, item) => s + tokenize(faqHaystack(item)).length, 0) / Math.max(faq.length, 1);
  return faq
    .map((item) => {
      const hay = faqHaystack(item).toLowerCase();
      let score = bm25Score(qTokens, tokenize(hay), avg);
      if (item.question.toLowerCase() === q || q.includes(item.question.toLowerCase())) score += 8;
      for (const alias of [item.question, ...item.aliases]) {
        if (alias && q.includes(alias.toLowerCase()) && alias.length > 8) score += 6;
      }
      const overlap = distinctiveOverlap(query, hay);
      if (overlap < 0.2) score *= 0.15;
      else score *= 0.6 + overlap;
      return { item, score };
    })
    .filter((h) => h.score > 1.2)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function searchCapabilities(
  query: string,
  capabilities: AssistantCapability[],
  limit = 4,
): RetrievedCapabilityHit[] {
  const q = query.toLowerCase();
  const qTokens = tokenize(query);
  const avg =
    capabilities.reduce((s, item) => s + tokenize(capabilityHaystack(item)).length, 0) /
    Math.max(capabilities.length, 1);
  return capabilities
    .map((item) => {
      const hay = capabilityHaystack(item).toLowerCase();
      let score = bm25Score(qTokens, tokenize(hay), avg);
      if (q.includes(item.name.toLowerCase()) || hay.includes(q)) score += 5;
      for (const alias of item.aliases) {
        if (alias && q.includes(alias.toLowerCase())) score += 4;
      }
      if (item.routes.some((route) => q.includes(route))) score += 3;
      return { item, score };
    })
    .filter((h) => h.score > 0.7)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function searchChunks(
  query: string,
  chunks: KnowledgeChunk[],
  options?: { limit?: number; broaden?: boolean },
): RetrievedChunkHit[] {
  const limit = options?.limit ?? (options?.broaden ? 8 : 4);
  const q = query.toLowerCase();
  const qTokens = tokenize(query);
  const avg = chunks.reduce((s, c) => s + tokenize(c.text).length, 0) / Math.max(chunks.length, 1);
  const minScore = options?.broaden ? 0.35 : 0.55;
  return chunks
    .map((chunk) => {
      const hay = `${chunk.title} ${chunk.path} ${chunk.text}`.toLowerCase();
      let score = bm25Score(qTokens, tokenize(hay), avg) * (PRIORITY_WEIGHT[chunk.priority] ?? 1);
      if (hay.includes(q.slice(0, 80))) score += 2;
      if (chunk.title && q.includes(chunk.title.toLowerCase())) score += 3;
      if (chunk.path && q.includes(chunk.path.toLowerCase())) score += 2;
      return { chunk, score };
    })
    .filter((h) => h.score > minScore)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.chunk.priority - b.chunk.priority;
    })
    .slice(0, limit);
}

export function retrieveKnowledge(
  query: string,
  pack: KnowledgePack,
  options?: { broaden?: boolean },
): RetrievalResult {
  return {
    faq: searchFaq(query, pack.faq, options?.broaden ? 5 : 3),
    capabilities: searchCapabilities(query, pack.capabilities, options?.broaden ? 6 : 4),
    documents: searchChunks(query, pack.chunks, { broaden: options?.broaden }),
  };
}

export function preferCurrentEvidence(hits: RetrievedChunkHit[]): RetrievedChunkHit[] {
  return [...hits].sort((a, b) => {
    const aHist = a.chunk.status === 'historical' || a.chunk.status === 'deprecated' ? 1 : 0;
    const bHist = b.chunk.status === 'historical' || b.chunk.status === 'deprecated' ? 1 : 0;
    if (aHist !== bHist) return aHist - bHist;
    if (a.chunk.priority !== b.chunk.priority) return a.chunk.priority - b.chunk.priority;
    return b.score - a.score;
  });
}
