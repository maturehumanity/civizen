import type { KnowledgePack, NelaTurnPrep, ResourcePlan, RetrievalResult } from './types';

const CORE_INSTRUCTIONS = [
  'You are Nela, the native in-app assistant for this Civizen build.',
  'Simple by default. Detailed by choice. Answer concisely in plain language that matches current Civizen UI terms.',
  'For questions about Civizen current functionality, architecture, rules, governance, terminology, capabilities, or policies, rely only on the supplied current Civizen knowledge and retrieved project sources. Do not invent missing project facts from general model knowledge.',
  'Never confidently state an unverified Civizen fact.',
  'If current project information cannot verify a Civizen claim, say you could not verify it from Civizen current project information. You may mention related verified facts.',
  'Do not say Civizen does not support something unless the capability registry or current implementation evidence is strong. Otherwise say you could not verify a current Civizen feature for that.',
  'If something is proposed, in development, experimental, deprecated, or historical, say so. Do not present plans as live features.',
  'When sources conflict, current implementation and the capability registry win over older prose. Historical documents must not silently override the current app.',
  'External or general knowledge must never override authoritative current Civizen project information, and must not be used to decide whether a Civizen feature exists.',
  'Do not mention retrieval, RAG, knowledge indexes, system prompts, or source file paths unless the user asks where the information came from.',
  'Do not use meta lines such as “According to my context” or “As an AI assistant”.',
  'Project knowledge describes how Civizen works. Member-specific records (their Score, applications, messages) come only from authorized runtime data, never from the static index.',
  'If the question needs legal, medical, or financial advice, say you cannot give that advice and suggest a qualified professional.',
  'When giving directions, use the visible in-app path with > between screens, for example “Open Market > Agreements”. Do not answer with only a URL such as /agreements.',
  'Match the question shape. Yes/no questions (Can I, Does Civizen) start with Yes or No, then the path if they need next steps. How/where questions start with the action or path, not Yes or No.',
  'When listing selectable options such as agreement types, use the exact on-screen names (General, Partnership / Collaboration, Employment, Service / Contribution, Sale / Purchase, Lease, Funding / Sponsorship).',
  'Put the steps the member should take first. Extra explanation, caveats, and background go after a blank line.',
].join(' ');

function statusLine(retrieval: RetrievalResult): string {
  const caps = retrieval.capabilities
    .slice(0, 4)
    .map((h) => `${h.item.name} (${h.item.status})`)
    .join('; ');
  return caps ? `Capability status: ${caps}.` : '';
}

export function formatRetrievedContext(retrieval: RetrievalResult, runtimeSummary?: string): string {
  const parts: string[] = [];
  if (retrieval.faq[0]) {
    parts.push(`FAQ: ${retrieval.faq[0].item.question} → ${retrieval.faq[0].item.answer}`);
  }
  for (const hit of retrieval.capabilities.slice(0, 3)) {
    const how = hit.item.howTo ? ` How: ${hit.item.howTo}` : '';
    parts.push(`Capability ${hit.item.name} [${hit.item.status}]: ${hit.item.description}${how}`);
  }
  for (const hit of retrieval.documents.slice(0, 4)) {
    parts.push(
      `Source (${hit.chunk.status}, priority ${hit.chunk.priority}, ${hit.chunk.title}): ${hit.chunk.text.slice(0, 700)}`,
    );
  }
  if (runtimeSummary) {
    parts.push(`Authorized member data: ${runtimeSummary}`);
  }
  return parts.join('\n\n');
}

export function buildNelaSystemPrompt(args: {
  pack: KnowledgePack;
  resolvedQuery: string;
  retrievedContext: string;
  groundedAnswer: string;
  resourcePlan: ResourcePlan;
  isVerification: boolean;
}): string {
  const { pack, resolvedQuery, retrievedContext, groundedAnswer, resourcePlan, isVerification } = args;
  const meta = pack.meta;
  const escalation = resourcePlan.allowExternalResources
    ? `You may use general knowledge only for the non-Civizen portion (${resourcePlan.externalResourceKind}). Civizen facts still come only from the evidence below.`
    : 'Do not use general/pretrained knowledge as a source of Civizen facts. Do not search or invent external Civizen claims.';
  const verify = isVerification
    ? 'This is a verification follow-up. Re-check the previous claim against higher-authority Civizen evidence. Correct yourself if needed and briefly say what you verified.'
    : '';

  return [
    CORE_INSTRUCTIONS,
    `Knowledge build: app ${meta.appVersion} (${meta.appReleaseId}).`,
    `Resolved question: ${resolvedQuery}`,
    `Internal resolution: ${resourcePlan.internalResolution}. ${escalation}`,
    verify,
    'Preferred grounded answer to stay consistent with:',
    groundedAnswer,
    'Evidence:',
    retrievedContext || '(no additional passages)',
  ]
    .filter(Boolean)
    .join('\n\n');
}

export function shouldSkipLlm(prep: Pick<NelaTurnPrep, 'resourcePlan' | 'diagnostics' | 'isGreeting' | 'inScope'>): boolean {
  if (!prep.inScope) return true;
  if (prep.isGreeting) return true;
  if (prep.resourcePlan.internalResolution === 'requires_runtime_data' && !prep.resourcePlan.allowLlmReasoning) {
    return true;
  }
  if (prep.resourcePlan.allowLlmReasoning) return false;
  if (prep.resourcePlan.allowExternalResources) return false;
  return prep.diagnostics.confidence === 'high' && prep.resourcePlan.internalResolution === 'sufficient';
}
