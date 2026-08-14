import { getCountryDialCode } from './countries';

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

/** Dial digits from a profile country code (`US`) or a stored dial code (`+1`). */
export function dialDigitsFromProfileCountry(phoneCountryCode: string | null | undefined): string {
  const raw = (phoneCountryCode ?? '').trim();
  if (!raw) return '';
  if (/^\+?\d+$/.test(raw)) return digitsOnly(raw);
  return digitsOnly(getCountryDialCode(raw));
}

/**
 * Phone strings to send to the lookup RPC for one device number.
 * Includes national digits and a country-prefixed form when we know the member's dial code.
 */
export function phoneLookupCandidates(raw: string, defaultDialCode = ''): string[] {
  const digits = digitsOnly(raw);
  const out = new Set<string>();
  if (digits.length >= 7 && digits.length <= 15) out.add(digits);

  const dial = digitsOnly(defaultDialCode);
  if (dial && digits.length >= 7 && digits.length <= 11 && !digits.startsWith(dial)) {
    const national = digits.startsWith('0') ? digits.slice(1) : digits;
    out.add(`${dial}${national}`);
  }
  if (digits.startsWith('0') && digits.length >= 8 && digits.length <= 15) {
    out.add(digits.slice(1));
  }
  return [...out];
}

export function phonesLikelyMatch(
  contactPhone: string,
  registeredDigits: string,
  defaultDialCode = '',
): boolean {
  const registered = digitsOnly(registeredDigits);
  if (registered.length < 7) return false;
  return phoneLookupCandidates(contactPhone, defaultDialCode).some((candidate) => {
    if (candidate === registered) return true;
    const shorter = candidate.length <= registered.length ? candidate : registered;
    const longer = candidate.length <= registered.length ? registered : candidate;
    return shorter.length >= 10 && longer.endsWith(shorter);
  });
}
