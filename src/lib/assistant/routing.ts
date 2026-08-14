import type {
  ExternalResourceKind,
  KnowledgePack,
  RequestKind,
  ResourcePlan,
  RetrievalResult,
  RuntimeDataNeed,
  RuntimeUserContext,
} from './types';
import { isGreetingOnly, textLooksCivizenRelated } from './scope';
import { isVerificationFollowUp } from './query-rewrite';

const USER_DATA_RE =
  /\b(my|mine|i have|have i|i've|i applied|applied to|show my|what(?:'s| is) my|my current)\b/i;
const USER_DATA_TOPICS =
  /\b(score|contributions?|applications?|messages?|inbox|opportunit(?:y|ies)?|profile|agreements?)\b/i;

const GENERAL_REASONING_RE =
  /\b(help me (draft|write|improve|plan|revise|compare)|explain why|brainstorm|make this (better|stronger)|critique)\b/i;

const EXTERNAL_WORLD_RE =
  /\b(california|switzerland|united nations|\bun\b|sdg|sustainable development|nonprofit (law|requirements)|incorporation|referendum system|current (law|requirements|news))\b/i;

const EXTERNAL_ACTION_RE =
  /\b(search the web|look (it )?up online|send (an )?email|browse the internet|fetch from the web)\b/i;

const WHAT_IS_GENERIC_RE = /^\s*what is (?!civizen\b)(.{2,80})\??\s*$/i;

function uniqueKinds(kinds: RequestKind[]): RequestKind[] {
  return [...new Set(kinds)];
}

export function classifyRequest(resolvedQuery: string, latestUserText: string, pack: KnowledgePack): RequestKind[] {
  const kinds: RequestKind[] = [];
  const q = `${resolvedQuery} ${latestUserText}`.toLowerCase();

  const catalogHit = pack.capabilities.some((c) => {
    if (q.includes(c.name.toLowerCase())) return true;
    return c.aliases.some((alias) => alias && q.includes(alias.toLowerCase()));
  }) || pack.faq.some((f) => q.includes(f.question.toLowerCase()) || f.aliases.some((a) => q.includes(a.toLowerCase())));

  if (
    textLooksCivizenRelated(resolvedQuery) ||
    catalogHit ||
    /\bcivizen\b/.test(q) ||
    /\b(does|can|how).*(app|platform|feature)\b/.test(q)
  ) {
    kinds.push('civizen_product');
  }

  if (USER_DATA_RE.test(q) && USER_DATA_TOPICS.test(q)) {
    kinds.push('civizen_user_data');
  }

  if (GENERAL_REASONING_RE.test(q)) {
    kinds.push('general_reasoning');
  }

  if (EXTERNAL_ACTION_RE.test(q)) {
    kinds.push('external_action');
  }

  const whatIs = WHAT_IS_GENERIC_RE.exec(latestUserText.trim());
  if (EXTERNAL_WORLD_RE.test(q) || (whatIs && !catalogHit && !textLooksCivizenRelated(whatIs[1] ?? ''))) {
    kinds.push('external_world');
  }

  if (!kinds.length) {
    kinds.push(textLooksCivizenRelated(resolvedQuery) ? 'civizen_product' : 'general_reasoning');
  }

  return uniqueKinds(kinds);
}

function runtimeNeedFromQuery(query: string): RuntimeDataNeed {
  const q = query.toLowerCase();
  if (q.includes('score')) {
    return { topic: 'score', hint: 'Open Profile or the Home Score card while signed in.', routes: ['/profile'] };
  }
  if (q.includes('message') || q.includes('inbox')) {
    return { topic: 'messages', hint: 'Open Messaging to see your conversations.', routes: ['/messaging'] };
  }
  if (q.includes('agreement')) {
    return { topic: 'agreements', hint: 'Open Market > Agreements to see your records.', routes: ['/agreements'] };
  }
  return {
    topic: 'contributions',
    hint: 'Open My Contributions or your Profile Contributions ledger while signed in.',
    routes: ['/contribute/impact', '/profile/contributions'],
  };
}

export function planResources(args: {
  kinds: RequestKind[];
  retrieval: RetrievalResult;
  confidence: 'high' | 'medium' | 'low' | 'none';
  isVerification: boolean;
  runtimeData?: RuntimeUserContext | null;
}): ResourcePlan {
  const { kinds, retrieval, confidence, isVerification, runtimeData } = args;
  const hasInternal =
    retrieval.faq.length > 0 || retrieval.capabilities.length > 0 || retrieval.documents.length > 0;
  const product = kinds.includes('civizen_product');
  const userData = kinds.includes('civizen_user_data');
  const general = kinds.includes('general_reasoning');
  const externalWorld = kinds.includes('external_world');
  const externalAction = kinds.includes('external_action');

  if (userData && !runtimeData) {
    return {
      kinds,
      internalResolution: 'requires_runtime_data',
      allowLlmReasoning: general || externalWorld,
      allowExternalResources: false,
      externalResourceKind: 'none',
      runtimeDataNeed: runtimeNeedFromQuery(
        retrieval.faq[0]?.item.question ?? retrieval.capabilities[0]?.item.name ?? 'my account',
      ),
      reason: 'Personal Civizen records require authorized runtime data, not the static project index.',
    };
  }

  if (product && (confidence === 'high' || confidence === 'medium') && hasInternal) {
    return {
      kinds,
      internalResolution: 'sufficient',
      allowLlmReasoning: general || isVerification,
      allowExternalResources: externalWorld || externalAction,
      externalResourceKind: externalAction ? 'external_action' : externalWorld ? 'model_general_knowledge' : 'none',
      runtimeDataNeed: null,
      reason: 'Authoritative Civizen evidence already answers the product question.',
    };
  }

  if (product && !hasInternal) {
    return {
      kinds,
      internalResolution: 'insufficient',
      allowLlmReasoning: general || externalWorld,
      allowExternalResources: externalWorld || externalAction,
      externalResourceKind: externalWorld || externalAction ? (externalAction ? 'external_action' : 'model_general_knowledge') : 'none',
      runtimeDataNeed: null,
      reason:
        'Civizen product facts were not verified internally. External resources must not invent a Civizen capability.',
    };
  }

  if (externalAction) {
    return {
      kinds,
      internalResolution: 'requires_external_action',
      allowLlmReasoning: true,
      allowExternalResources: true,
      externalResourceKind: 'external_action',
      runtimeDataNeed: null,
      reason: 'The request asks for an external action beyond Civizen project knowledge.',
    };
  }

  if (externalWorld) {
    return {
      kinds,
      internalResolution: 'requires_external_information',
      allowLlmReasoning: true,
      allowExternalResources: true,
      externalResourceKind: 'model_general_knowledge',
      runtimeDataNeed: null,
      reason: 'The non-Civizen portion may use general or current external information.',
    };
  }

  if (general) {
    return {
      kinds,
      internalResolution: hasInternal ? 'sufficient' : 'insufficient',
      allowLlmReasoning: true,
      allowExternalResources: false,
      externalResourceKind: 'none',
      runtimeDataNeed: null,
      reason: 'Generative assistance can use AI reasoning after any relevant Civizen context is attached.',
    };
  }

  return {
    kinds,
    internalResolution: hasInternal ? 'sufficient' : 'insufficient',
    allowLlmReasoning: confidence !== 'high',
    allowExternalResources: false,
    externalResourceKind: 'none',
    runtimeDataNeed: null,
    reason: hasInternal ? 'Internal Civizen evidence is enough.' : 'No internal evidence matched.',
  };
}

export function shouldInvokeExternalSearch(
  plan: ResourcePlan,
  latestUserText: string,
): ExternalResourceKind | null {
  if (!plan.allowExternalResources) return null;
  if (plan.internalResolution === 'insufficient' && plan.kinds.includes('civizen_product') && !plan.kinds.includes('external_world')) {
    return null;
  }
  if (isGreetingOnly(latestUserText) || isVerificationFollowUp(latestUserText)) {
    if (plan.kinds.includes('civizen_product') && !plan.kinds.includes('external_world')) return null;
  }
  if (plan.externalResourceKind === 'none') return null;
  return plan.externalResourceKind;
}

export type Confidence = 'high' | 'medium' | 'low' | 'none';

export function retrievalConfidence(retrieval: RetrievalResult): Confidence {
  const faq = retrieval.faq[0]?.score ?? 0;
  const cap = retrieval.capabilities[0]?.score ?? 0;
  const doc = retrieval.documents[0]?.score ?? 0;
  if (faq >= 6 || cap >= 7) return 'high';
  if (faq >= 2.5 || cap >= 3 || doc >= 2.2) return 'medium';
  if (faq > 0 || cap > 0 || doc > 0) return 'low';
  return 'none';
}
