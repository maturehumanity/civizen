import { getCountryOptions } from '@/lib/countries';
import { getCountryCapitalName } from '@/lib/country-capitals';

export type GeoRegionOption = {
  code: string;
  name: string;
};

export type GeoCapitalLocation = {
  city: string;
  regionCode: string | null;
};

type GeoModule = typeof import('country-state-city');

let geoModulePromise: Promise<GeoModule> | null = null;

function loadGeoModule(): Promise<GeoModule> {
  if (!geoModulePromise) {
    geoModulePromise = import('country-state-city');
  }
  return geoModulePromise;
}

function normalizePlaceName(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function capitalMatchScore(cityName: string, capitalName: string): number {
  const city = normalizePlaceName(cityName);
  const capital = normalizePlaceName(capitalName);
  if (!city || !capital) return 0;
  if (city === capital) return 100;
  // Allow "Washington D C" style extensions, but not "Londonderry" for "London".
  const tokens = city.split(/\s+/).filter(Boolean);
  if (tokens[0] === capital && tokens.length > 1) return 85;
  return 0;
}

/** All ISO country codes used across Civizen (sorted by localized name). */
export function listGeoCountryCodes(locale: string): string[] {
  return getCountryOptions(locale).map((option) => option.code);
}

/** States / provinces for a country (ISO 3166-2 style codes). */
export async function listGeoRegions(countryCode: string): Promise<GeoRegionOption[]> {
  const code = countryCode.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return [];

  const { State } = await loadGeoModule();
  return State.getStatesOfCountry(code)
    .map((state) => ({
      code: state.isoCode,
      name: state.name,
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

/** Cities for a country + state/region code. */
export async function listGeoCities(countryCode: string, regionCode: string): Promise<string[]> {
  const country = countryCode.trim().toUpperCase();
  const region = regionCode.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(country) || !region) return [];

  const { City } = await loadGeoModule();
  return City.getCitiesOfState(country, region)
    .map((city) => city.name)
    .sort((left, right) => left.localeCompare(right));
}

/** Cities for a country (all states). Prefer listGeoCities when a region is known. */
export async function listGeoCitiesOfCountry(countryCode: string): Promise<string[]> {
  const country = countryCode.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(country)) return [];

  const { City } = await loadGeoModule();
  const names = (City.getCitiesOfCountry(country) ?? []).map((city) => city.name);
  return Array.from(new Set(names)).sort((left, right) => left.localeCompare(right));
}


/**
 * Resolve a country’s capital city and matching region/state code from the geo catalog.
 * Used when profile location cannot auto-fill after a country change.
 */
export async function resolveCountryCapitalLocation(
  countryCode: string,
): Promise<GeoCapitalLocation | null> {
  const code = countryCode.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return null;

  const capitalName = getCountryCapitalName(code);
  if (!capitalName) return null;

  const { City } = await loadGeoModule();
  const cities = City.getCitiesOfCountry(code) ?? [];
  let best: { name: string; stateCode: string; score: number } | null = null;

  for (const city of cities) {
    const score = capitalMatchScore(city.name, capitalName);
    if (score <= 0) continue;
    if (
      !best ||
      score > best.score ||
      (score === best.score && city.name.length > best.name.length)
    ) {
      best = { name: city.name, stateCode: city.stateCode, score };
    }
  }

  if (best) {
    return {
      city: best.name,
      regionCode: best.stateCode || null,
    };
  }

  // Capital known but not present in the city catalog — still show the capital name.
  return { city: capitalName, regionCode: null };
}

export function getGeoRegionName(
  regions: GeoRegionOption[],
  regionCode: string | null | undefined,
): string | null {
  if (!regionCode) return null;
  const match = regions.find((region) => region.code.toUpperCase() === regionCode.toUpperCase());
  return match?.name ?? null;
}
