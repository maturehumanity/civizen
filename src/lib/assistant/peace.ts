/**
 * Humanity-scale peace / cooperation asks.
 * Answer with practical Civizen steps, not manifesto recap.
 */

const PEACE_RE =
  /\b(stop(ping)? (the )?wars?|end(ing)? (the )?wars?|prevent(ing)? wars?|world peace|(achieve|create|build|make|keep|protect) (world |lasting |global )?peace|live in peace|peaceful coexistence|unite humanity|end (the )?fighting|stop (the )?fighting|how (can|do|should) (we|humanity|people) .{0,48}(peace|war|wars|unite))\b/i;

export const PEACE_COOPERATION_FAQ_ID = 'how_can_we_stop_wars';

export const PEACE_COOPERATION_REPLY =
  'Civizen cannot stop a war tonight, and it is not a government. Peace is built when people practice cooperation before disaster forces it.\n\nIndividually: create an account from Sign up. Open Study to learn shared civic principles. Then take one real step in Contribute — Community Challenges for a local problem, or Opportunities for verifiable work.\n\nCollectively: name shared problems and carry solutions through to outcomes with evidence. Practice transparent Governance. Grow voluntary world citizenship as a complementary civic identity — nations and cultures stay; a shared human responsibility is added.\n\nStart with Sign up, then take one of those steps this week.';

export function isPeaceCooperationAsk(content: string): boolean {
  const text = content.trim();
  if (!text) return false;
  return PEACE_RE.test(text);
}
