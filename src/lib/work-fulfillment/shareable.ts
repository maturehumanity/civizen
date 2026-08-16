/**
 * Private Work Fulfillment data must never become shareable by inference.
 * Opportunity matching may use only member-approved preference fields.
 */

export const PRIVATE_WORK_FIELDS = [
  'dissatisfaction',
  'manager_team_concerns',
  'work_joy_entries',
  'private_notes',
  'role_problems',
  'intervention_history',
  'emotional_experience',
  'diagnosis',
  'assessment_dimensions',
  'follow_up_outcomes',
] as const;

export const SHAREABLE_WORK_FIELDS = [
  'skills',
  'experience',
  'preferred_activity_types',
  'environment_preferences',
  'schedule_location_preferences',
  'stated_work_interests',
] as const;

export function privateWorkFieldsForbiddenInOpportunityMatching(): readonly string[] {
  return PRIVATE_WORK_FIELDS;
}

export function opportunityPayloadMustOmitPrivateWork(payload: Record<string, unknown>): string[] {
  return PRIVATE_WORK_FIELDS.filter((field) => field in payload);
}

export function canUsePreferencesForOpportunityMatching(approved: boolean): boolean {
  return approved;
}
