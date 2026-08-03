/**
 * Countries where state/province is commonly needed in an address line.
 * Smaller countries omit the province token in the Education sentence.
 */
const EDUCATION_REGION_VISIBLE_COUNTRIES = new Set([
  'AR',
  'AU',
  'BD',
  'BR',
  'CA',
  'CL',
  'CN',
  'CO',
  'DE',
  'EG',
  'ES',
  'FR',
  'GB',
  'ID',
  'IN',
  'IT',
  'JP',
  'KR',
  'MX',
  'MY',
  'NG',
  'PE',
  'PH',
  'PK',
  'PL',
  'RU',
  'SA',
  'TH',
  'TR',
  'UA',
  'US',
  'VE',
  'VN',
  'ZA',
  'AE',
]);

export function countryShowsEducationRegion(countryCode: string | null | undefined): boolean {
  const code = (countryCode || '').trim().toUpperCase();
  return EDUCATION_REGION_VISIBLE_COUNTRIES.has(code);
}
