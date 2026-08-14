import { describe, expect, it } from 'vitest';

import { civizenInviteSignupUrl, civizenInviteSmsHref, civizenInviteText } from '@/lib/civizen-invite';

describe('Civizen invite', () => {
  it('points invites at signup on the current origin', () => {
    expect(civizenInviteSignupUrl('https://civizen.world/')).toBe('https://civizen.world/signup');
  });

  it('names the person in the SMS body when we have a name', () => {
    expect(civizenInviteText({ origin: 'https://civizen.world', name: 'Ada' }).text).toContain(
      'Hi Ada, join me on Civizen: https://civizen.world/signup',
    );
  });

  it('builds an sms: link with the invite text', () => {
    const href = civizenInviteSmsHref('+12015550123', 'Join me on Civizen: https://civizen.world/signup');
    expect(href.startsWith('sms:+12015550123?body=')).toBe(true);
    expect(href).toContain(encodeURIComponent('Join me on Civizen: https://civizen.world/signup'));
  });
});
