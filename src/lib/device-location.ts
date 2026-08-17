export type DetectedDeviceLocation = {
  city: string | null;
  regionCode: string | null;
  countryCode: string | null;
  countryName: string | null;
};

export class LocationPermissionError extends Error {
  readonly code: 'denied' | 'unavailable' | 'timeout' | 'unsupported';

  constructor(code: LocationPermissionError['code'], message: string) {
    super(message);
    this.name = 'LocationPermissionError';
    this.code = code;
  }
}

function normalizeRegionCode(raw: string | null | undefined, countryCode: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim().toUpperCase();
  if (!trimmed) return null;

  // e.g. "US-CA" → "CA"
  if (countryCode && trimmed.startsWith(`${countryCode}-`)) {
    return trimmed.slice(countryCode.length + 1) || null;
  }
  if (/^[A-Z]{2}$/.test(trimmed)) return trimmed;
  if (/^[A-Z]{2,3}$/.test(trimmed)) return trimmed;
  return trimmed.slice(0, 3);
}

type BigDataCloudResponse = {
  city?: string;
  locality?: string;
  principalSubdivision?: string;
  principalSubdivisionCode?: string;
  countryCode?: string;
  countryName?: string;
};

export function parseBigDataCloudLocation(data: BigDataCloudResponse): DetectedDeviceLocation {
  const countryCode = data.countryCode?.trim().toUpperCase() || null;
  const city = (data.city || data.locality || '').trim() || null;
  const regionCode = normalizeRegionCode(data.principalSubdivisionCode, countryCode);

  return {
    city,
    regionCode,
    countryCode,
    countryName: data.countryName?.trim() || null,
  };
}

async function fetchBigDataCloudLocation(latitude?: number, longitude?: number): Promise<DetectedDeviceLocation> {
  const url = new URL('https://api.bigdatacloud.net/data/reverse-geocode-client');
  if (typeof latitude === 'number' && typeof longitude === 'number') {
    url.searchParams.set('latitude', String(latitude));
    url.searchParams.set('longitude', String(longitude));
  }
  url.searchParams.set('localityLanguage', 'en');

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`reverse_geocode_failed_${response.status}`);
  }

  return parseBigDataCloudLocation((await response.json()) as BigDataCloudResponse);
}

async function reverseGeocodeBigDataCloud(latitude: number, longitude: number): Promise<DetectedDeviceLocation> {
  return fetchBigDataCloudLocation(latitude, longitude);
}

export function requestDevicePosition(options?: PositionOptions): Promise<GeolocationPosition> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return Promise.reject(
      new LocationPermissionError('unsupported', 'This device does not support location services.'),
    );
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, (error) => {
      if (error.code === error.PERMISSION_DENIED) {
        reject(
          new LocationPermissionError(
            'denied',
            'Location permission was denied. Enable it to detect city, state, and country.',
          ),
        );
        return;
      }
      if (error.code === error.TIMEOUT) {
        reject(new LocationPermissionError('timeout', 'Location request timed out. Try again.'));
        return;
      }
      reject(
        new LocationPermissionError(
          'unavailable',
          'Location is unavailable right now. Try again in a moment.',
        ),
      );
    }, {
      enableHighAccuracy: false,
      timeout: 15000,
      maximumAge: 60_000,
      ...options,
    });
  });
}

/** Request device location permission and reverse-geocode to city / region / country. */
export async function detectDeviceLocation(
  options?: PositionOptions,
): Promise<DetectedDeviceLocation> {
  const position = await requestDevicePosition(options);
  return reverseGeocodeBigDataCloud(position.coords.latitude, position.coords.longitude);
}

/** Infer city / region / country from the visitor IP. Does not prompt for GPS. */
export async function detectVisitorLocation(): Promise<DetectedDeviceLocation> {
  return fetchBigDataCloudLocation();
}
