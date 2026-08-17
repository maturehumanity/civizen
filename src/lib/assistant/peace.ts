/**
 * Humanity-scale peace / cooperation asks.
 * Compact form of founding Civizen documents — not a new manifesto.
 * Sources: why-civizen-exists, identity, recognized planetary citizenship pathway.
 */

const PEACE_RE =
  /\b(stop(ping)? (the )?wars?|end(ing)? (the )?wars?|prevent(ing)? wars?|world peace|(achieve|create|build|make|keep|protect) (world |lasting |global )?peace|live in peace|peaceful coexistence|unite humanity|end (the )?fighting|stop (the )?fighting|how (can|do|should) (we|humanity|people) .{0,48}(peace|war|wars|unite))\b/i;

export const PEACE_COOPERATION_FAQ_ID = 'how_can_we_stop_wars';

export const PEACE_COOPERATION_REPLY =
  'Civizen exists to help people unite around shared human responsibility. Peace needs more than speeches, slogans, or treaties. It needs practical systems people can join, examine, improve, and hold accountable.\n\nUnity does not require uniformity — nations and cultures stay, while a complementary world citizenship adds a shared layer of responsibility. Civizen is not a government. It is the work through which wars should become unnecessary, because people have practical tools to create and protect peace instead of only hoping for it.\n\nStart by signing up, then make a contribution. You can take part through Community Challenges, Opportunities, Study, and Governance.';

export function isPeaceCooperationAsk(content: string): boolean {
  const text = content.trim();
  if (!text) return false;
  return PEACE_RE.test(text);
}
