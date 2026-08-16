import type { AssessmentInstrument, AssessmentQuestion, HappinessDomainId } from './types';
import { HAPPINESS_DOMAINS } from './types';

const DOMAIN_PROMPTS: Record<HappinessDomainId, string> = {
  life_satisfaction: 'Overall, how is your life going right now?',
  emotional_wellbeing: 'How have you generally felt, day to day, recently?',
  meaning_purpose: 'How meaningful does your life feel at the moment?',
  relationships_belonging: 'How are your relationships and sense of belonging?',
  health_vitality: 'How is your health, energy, and vitality?',
  autonomy_freedom: 'How much control do you have over the way you live and work?',
  security_stability: 'How secure and stable do things feel (home, money, safety)?',
  time_life_balance: 'How is the balance of your time?',
  environment_community: 'How well does your environment and community support you?',
  work_fulfillment: 'How fulfilling is your work or occupation?',
};

export function civizenDomainReviewQuestions(): AssessmentQuestion[] {
  return HAPPINESS_DOMAINS.map((domain) => ({
    id: `domain-${domain}`,
    prompt: DOMAIN_PROMPTS[domain],
    responseType: 'five_level',
    domain,
  }));
}

/** Civizen-native instrument. Do not substitute copyrighted clinical scales. */
export function civizenDomainReviewInstrument(): Omit<AssessmentInstrument, 'id'> {
  return {
    slug: 'civizen-domain-review-v1',
    name: 'Civizen Happiness Domain Review',
    version: '1.0',
    publisher: 'Civizen',
    sourceUrl: null,
    license: 'civizen-internal',
    language: 'en',
    allowedUse: 'civizen_native_non_clinical',
    questions: civizenDomainReviewQuestions(),
    scoringLogic: {
      model_version: 'happiness-level-v1',
      maps_to: 'domain_levels',
      public_output: 'five_level_states',
      internal_scale: '0_100_not_shown',
    },
    interpretationRules: {
      clinical_diagnosis: false,
      identity_language: false,
      public_numeric_score: false,
    },
    references: [
      {
        note: 'Civizen-native domain review. Not a licensed clinical instrument.',
      },
    ],
  };
}
