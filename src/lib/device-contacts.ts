import { Capacitor } from '@capacitor/core';
import { Contacts } from '@capacitor-community/contacts';

export type DeviceContact = {
  id: string;
  name: string;
  phones: string[];
};

export type DeviceContactsAccess = 'unsupported' | 'prompt' | 'granted' | 'denied';

type ContactInfoPicker = {
  select: (
    properties: string[],
    options?: { multiple?: boolean },
  ) => Promise<Array<{ name?: string[]; tel?: string[] }>>;
};

function webContactPicker(): ContactInfoPicker | null {
  if (typeof navigator === 'undefined') return null;
  const contacts = (navigator as Navigator & { contacts?: ContactInfoPicker }).contacts;
  return contacts && typeof contacts.select === 'function' ? contacts : null;
}

export function deviceContactsAreAvailable(): boolean {
  return Capacitor.isNativePlatform() || Boolean(webContactPicker());
}

export function nativeDeviceContactsAreAvailable(): boolean {
  return Capacitor.isNativePlatform();
}

export async function getDeviceContactsAccess(): Promise<DeviceContactsAccess> {
  if (!Capacitor.isNativePlatform()) {
    return webContactPicker() ? 'prompt' : 'unsupported';
  }
  try {
    const status = await Contacts.checkPermissions();
    if (status.contacts === 'granted' || status.contacts === 'limited') return 'granted';
    if (status.contacts === 'denied') return 'denied';
    return 'prompt';
  } catch {
    return 'unsupported';
  }
}

export async function requestDeviceContactsAccess(): Promise<DeviceContactsAccess> {
  if (!Capacitor.isNativePlatform()) {
    return webContactPicker() ? 'prompt' : 'unsupported';
  }
  try {
    const status = await Contacts.requestPermissions();
    if (status.contacts === 'granted' || status.contacts === 'limited') return 'granted';
    if (status.contacts === 'denied') return 'denied';
    return 'prompt';
  } catch {
    return 'denied';
  }
}

function toDeviceContact(
  id: string,
  name: string | null | undefined,
  phones: Array<{ number?: string | null } | string | null | undefined>,
): DeviceContact | null {
  const numbers = phones
    .map((entry) => (typeof entry === 'string' ? entry : entry?.number ?? ''))
    .map((value) => value.trim())
    .filter(Boolean);
  const display = name?.trim() || numbers[0] || '';
  if (!display || numbers.length === 0) return null;
  return { id, name: display, phones: numbers };
}

export async function readDeviceContacts(): Promise<DeviceContact[]> {
  if (!Capacitor.isNativePlatform()) return [];
  const { contacts } = await Contacts.getContacts({
    projection: { name: true, phones: true },
  });
  const out: DeviceContact[] = [];
  for (const row of contacts ?? []) {
    const mapped = toDeviceContact(row.contactId, row.name?.display, row.phones ?? []);
    if (mapped) out.push(mapped);
  }
  return out;
}

export async function pickWebContacts(): Promise<DeviceContact[]> {
  const picker = webContactPicker();
  if (!picker) return [];
  const selected = await picker.select(['name', 'tel'], { multiple: true });
  const out: DeviceContact[] = [];
  selected.forEach((row, index) => {
    const mapped = toDeviceContact(
      `web-${index}-${row.tel?.[0] ?? row.name?.[0] ?? 'contact'}`,
      row.name?.[0],
      row.tel ?? [],
    );
    if (mapped) out.push(mapped);
  });
  return out;
}

export function filterDeviceContacts(contacts: DeviceContact[], query: string): DeviceContact[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const qDigits = q.replace(/\D/g, '');
  return contacts.filter((contact) => {
    if (contact.name.toLowerCase().includes(q)) return true;
    if (qDigits.length >= 3) {
      return contact.phones.some((phone) => phone.replace(/\D/g, '').includes(qDigits));
    }
    return false;
  });
}
