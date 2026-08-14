import { describe, expect, it } from 'vitest';

import { filterDeviceContacts } from '@/lib/device-contacts';

describe('filterDeviceContacts', () => {
  const contacts = [
    { id: '1', name: 'Ada Lovelace', phones: ['+1 201 555 0123'] },
    { id: '2', name: 'Grace Hopper', phones: ['555-0199'] },
  ];

  it('matches by name', () => {
    expect(filterDeviceContacts(contacts, 'ada').map((row) => row.id)).toEqual(['1']);
  });

  it('matches by phone digits', () => {
    expect(filterDeviceContacts(contacts, '201555').map((row) => row.id)).toEqual(['1']);
  });
});
