import { describe, expect, it } from 'vitest';

import { resolveCountryCapitalLocation } from '@/lib/geo-locations';

describe('resolveCountryCapitalLocation', () => {
  it('resolves Armenia to Yerevan and its region', async () => {
    const location = await resolveCountryCapitalLocation('AM');
    expect(location?.city).toMatch(/Yerevan/i);
    expect(location?.regionCode).toBeTruthy();
  });

  it('resolves US to Washington, D.C. in DC', async () => {
    const location = await resolveCountryCapitalLocation('US');
    expect(location?.city.toLowerCase()).toContain('washington');
    expect(location?.regionCode).toBe('DC');
  });
});
