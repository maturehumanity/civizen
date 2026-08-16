/**
 * Immediate human-need asks (housing, food, safety tonight).
 * These must not be answered as Contribute / volunteer routing.
 */

const HARDSHIP_RE =
  /\b(homeless|houseless|unhoused|no( |-)?where to (sleep|stay|live)|no place to (sleep|stay|live)|need (a )?(shelter|place to stay)|looking for shelter|sleeping (outside|rough|on the street|in (my|a) car)|i('m| am) (hungry|starving)|need food|food (insecure|insecurity)|evicted|facing eviction|i need housing|house me)\b/i;

const OFFERING_HELP_RE =
  /\b(how (can|do) i (contribute|help|volunteer)|want to help (others|people|the community)|ways to contribute)\b/i;

export const PERSONAL_HARDSHIP_FAQ_ID = 'if_i_need_housing_or_emergency_help';

export const PERSONAL_HARDSHIP_REPLY =
  "I'm sorry you're going through this. Civizen is not a shelter, housing office, or emergency service, and I cannot arrange a place to stay or send money.\n\nIf you need a safe place tonight, contact local emergency services or a local homelessness helpline. In many regions, 211 can connect you to nearby help.\n\nIf you want work, Jobs is open without an account. Open Market > Jobs. Community Challenges is for local problems over time — not emergency housing.";

export function isPersonalHardshipAsk(content: string): boolean {
  const text = content.trim();
  if (!text) return false;
  if (OFFERING_HELP_RE.test(text)) return false;
  return HARDSHIP_RE.test(text);
}
