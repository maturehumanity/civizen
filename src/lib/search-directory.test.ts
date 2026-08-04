import { describe, expect, it } from 'vitest';

import { parseSearchDirectoryPayload } from '@/lib/search-directory';

describe('parseSearchDirectoryPayload', () => {
  it('maps people and companies with owners', () => {
    const parsed = parseSearchDirectoryPayload({
      people: [
        {
          id: 'person-1',
          username: 'armen',
          full_name: 'Armen Yeremyan',
          avatar_url: null,
          is_verified: true,
        },
      ],
      companies: [
        {
          profile_id: 'biz-1',
          business_name_normalized: 'civizen',
          username: 'biz_civizen',
          full_name: 'Civizen',
          avatar_url: null,
          is_verified: true,
          owner_id: 'person-1',
          owner_username: 'armen',
          owner_full_name: 'Armen Yeremyan',
          owner_avatar_url: null,
          owner_is_verified: true,
        },
      ],
    });

    expect(parsed.people).toHaveLength(1);
    expect(parsed.companies).toHaveLength(1);
    expect(parsed.companies[0].owner?.full_name).toBe('Armen Yeremyan');
    expect(parsed.companies[0].profile.full_name).toBe('Civizen');
  });

  it('dedupes business profiles out of people when both lists contain the same id', () => {
    const parsed = parseSearchDirectoryPayload({
      people: [
        {
          id: 'biz-1',
          username: 'biz_civizen',
          full_name: 'Civizen',
          avatar_url: null,
          is_verified: true,
        },
      ],
      companies: [
        {
          profile_id: 'biz-1',
          business_name_normalized: 'civizen',
          username: 'biz_civizen',
          full_name: 'Civizen',
          avatar_url: null,
          is_verified: true,
          owner_id: 'person-1',
          owner_username: 'armen',
          owner_full_name: 'Armen Yeremyan',
          owner_avatar_url: null,
          owner_is_verified: true,
        },
      ],
    });

    expect(parsed.people).toHaveLength(0);
    expect(parsed.companies).toHaveLength(1);
  });

  it('returns empty lists for invalid payloads', () => {
    expect(parseSearchDirectoryPayload(null)).toEqual({ people: [], companies: [] });
    expect(parseSearchDirectoryPayload({})).toEqual({ people: [], companies: [] });
  });
});
