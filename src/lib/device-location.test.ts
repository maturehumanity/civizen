import { describe, expect, it, vi, afterEach } from 'vitest';

import { detectVisitorLocation, parseBigDataCloudLocation } from '@/lib/device-location';

describe('device-location', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('parses city, region, and country from BigDataCloud', () => {
    expect(
      parseBigDataCloudLocation({
        city: 'Bakersfield',
        principalSubdivisionCode: 'US-CA',
        countryCode: 'us',
        countryName: 'United States',
      }),
    ).toEqual({
      city: 'Bakersfield',
      regionCode: 'CA',
      countryCode: 'US',
      countryName: 'United States',
    });
  });

  it('detects visitor place from IP without GPS coordinates', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const href = String(input);
        expect(href).toContain('reverse-geocode-client');
        expect(href).not.toContain('latitude=');
        return {
          ok: true,
          json: async () => ({
            city: 'Yerevan',
            countryCode: 'AM',
            countryName: 'Armenia',
          }),
        };
      }),
    );

    await expect(detectVisitorLocation()).resolves.toEqual({
      city: 'Yerevan',
      regionCode: null,
      countryCode: 'AM',
      countryName: 'Armenia',
    });
  });
});
