/**
 * Humanity-scale peace / cooperation asks.
 * Answer with practical Civizen steps, not manifesto recap.
 */

const PEACE_RE =
  /\b(stop(ping)? (the )?wars?|end(ing)? (the )?wars?|prevent(ing)? wars?|world peace|(achieve|create|build|make|keep|protect) (world |lasting |global )?peace|live in peace|peaceful coexistence|unite humanity|end (the )?fighting|stop (the )?fighting|how (can|do|should) (we|humanity|people) .{0,48}(peace|war|wars|unite))\b/i;

export const PEACE_COOPERATION_FAQ_ID = 'how_can_we_stop_wars';

export const PEACE_COOPERATION_REPLY =
  'Yes. Civizen aims to eventually stop wars as a result of its activities and engagement: people learning, contributing, collaborating, governing, and solving common challenges until cooperation is ordinary civic life.\n\nIt is not a government and cannot end a war tonight. The work is to build the shared system that makes lasting peace possible — including voluntary world citizenship alongside nations and cultures.\n\nStart with Sign up. Open Study. Then take one step in Contribute — Community Challenges or Opportunities — and practice Governance. That participation is the path.';

export function isPeaceCooperationAsk(content: string): boolean {
  const text = content.trim();
  if (!text) return false;
  return PEACE_RE.test(text);
}
