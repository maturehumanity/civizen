import { describe, expect, it } from 'vitest';

import { resolveChatPageHref, splitChatPageLinks } from '@/lib/chat-page-links';

describe('chat page links', () => {
  it('resolves known Civizen routes and nested pages', () => {
    expect(resolveChatPageHref('/agreements')).toBe('/agreements');
    expect(resolveChatPageHref('/agreements/new')).toBe('/agreements/new');
    expect(resolveChatPageHref('/contribute/challenges')).toBe('/contribute/challenges');
    expect(resolveChatPageHref('/partners')).toBe('/partners');
  });

  it('does not treat unknown or unsafe paths as pages', () => {
    expect(resolveChatPageHref('/not-a-civizen-page')).toBeNull();
    expect(resolveChatPageHref('//evil.example')).toBeNull();
    expect(resolveChatPageHref('/javascript:alert(1)')).toBeNull();
  });

  it('links Sign up in a Civi peace answer', () => {
    const parts = splitChatPageLinks('Start with Sign up, then open Study.');
    expect(parts).toEqual([
      { type: 'text', value: 'Start with ' },
      { type: 'page', value: 'Sign up', href: '/signup' },
      { type: 'text', value: ', then open ' },
      { type: 'page', value: 'Study', href: '/study' },
      { type: 'text', value: '.' },
    ]);
  });

  it('turns visible trails into tappable page names', () => {
    const parts = splitChatPageLinks('Open Market > Agreements and tap +.');
    expect(parts).toEqual([
      { type: 'text', value: 'Open ' },
      { type: 'page', value: 'Market', href: '/market' },
      { type: 'text', value: ' > ' },
      { type: 'page', value: 'Agreements', href: '/agreements' },
      { type: 'text', value: ' and tap +.' },
    ]);
  });

  it('still links leftover URL mentions for older messages', () => {
    const parts = splitChatPageLinks('Also see /contribute/challenges.');
    expect(parts).toEqual([
      { type: 'text', value: 'Also see ' },
      { type: 'page', value: '/contribute/challenges', href: '/contribute/challenges' },
      { type: 'text', value: '.' },
    ]);
  });

  it('links selectable agreement types in the main answer', () => {
    const parts = splitChatPageLinks(
      'Choose a type such as General, Partnership / Collaboration, Employment, Service / Contribution, Sale / Purchase, or Funding / Sponsorship.',
    );
    expect(parts.filter((part) => part.type === 'page')).toEqual([
      { type: 'page', value: 'General', href: '/agreements/new?type=general' },
      { type: 'page', value: 'Partnership / Collaboration', href: '/agreements/new?type=partnership' },
      { type: 'page', value: 'Employment', href: '/agreements/new?type=employment' },
      { type: 'page', value: 'Service / Contribution', href: '/agreements/new?type=service_contribution' },
      { type: 'page', value: 'Sale / Purchase', href: '/agreements/new?type=sale_purchase' },
      { type: 'page', value: 'Funding / Sponsorship', href: '/agreements/new?type=funding' },
    ]);
  });

  it('does not treat short type names as links outside a type list', () => {
    expect(splitChatPageLinks('In General this is Employment related.')).toEqual([
      { type: 'text', value: 'In General this is Employment related.' },
    ]);
  });

  it('does not turn caveat mentions into create links when choices are off', () => {
    const parts = splitChatPageLinks(
      'Ordinary Marketplace purchases stay as orders and do not automatically create a Sale / Purchase Agreement.',
      { includeChoices: false },
    );
    expect(parts).toEqual([
      {
        type: 'text',
        value:
          'Ordinary Marketplace purchases stay as orders and do not automatically create a Sale / Purchase Agreement.',
      },
    ]);
  });
});
