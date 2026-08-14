export function civizenInviteSignupUrl(origin: string): string {
  return `${origin.replace(/\/$/, '')}/signup`;
}

export function civizenInviteText(options: { origin: string; name?: string | null }): {
  url: string;
  text: string;
} {
  const url = civizenInviteSignupUrl(options.origin);
  const name = options.name?.trim();
  const text = name ? `Hi ${name}, join me on Civizen: ${url}` : `Join me on Civizen: ${url}`;
  return { url, text };
}

export function civizenInviteSmsHref(phone: string, text: string): string {
  const trimmed = phone.trim();
  return `sms:${trimmed}?body=${encodeURIComponent(text)}`;
}

export async function shareCivizenInvite(options: {
  origin: string;
  name?: string | null;
  phone?: string | null;
}): Promise<'sms' | 'share' | 'clipboard'> {
  const { url, text } = civizenInviteText({ origin: options.origin, name: options.name });
  const phone = options.phone?.trim();
  if (phone) {
    window.location.assign(civizenInviteSmsHref(phone, text));
    return 'sms';
  }
  if (typeof navigator.share === 'function') {
    await navigator.share({ title: 'Civizen', text, url });
    return 'share';
  }
  await navigator.clipboard.writeText(text);
  return 'clipboard';
}
