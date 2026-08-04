export interface SearchDirectoryPerson {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  is_verified: boolean | null;
}

export interface SearchDirectoryOwner {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  is_verified: boolean | null;
}

export interface SearchDirectoryCompany {
  profile_id: string;
  business_name_normalized: string | null;
  profile: SearchDirectoryPerson;
  owner: SearchDirectoryOwner | null;
}

export interface SearchDirectoryPayload {
  people: SearchDirectoryPerson[];
  companies: SearchDirectoryCompany[];
}

type RawPerson = {
  id?: unknown;
  username?: unknown;
  full_name?: unknown;
  avatar_url?: unknown;
  is_verified?: unknown;
};

type RawCompany = RawPerson & {
  profile_id?: unknown;
  business_name_normalized?: unknown;
  owner_id?: unknown;
  owner_username?: unknown;
  owner_full_name?: unknown;
  owner_avatar_url?: unknown;
  owner_is_verified?: unknown;
};

function asString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function asBoolean(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null;
}

function parsePerson(raw: RawPerson | null | undefined): SearchDirectoryPerson | null {
  if (!raw || typeof raw.id !== 'string' || !raw.id) return null;
  return {
    id: raw.id,
    username: asString(raw.username),
    full_name: asString(raw.full_name),
    avatar_url: asString(raw.avatar_url),
    is_verified: asBoolean(raw.is_verified),
  };
}

function parseCompany(raw: RawCompany | null | undefined): SearchDirectoryCompany | null {
  if (!raw) return null;
  const profileId = typeof raw.profile_id === 'string' ? raw.profile_id : typeof raw.id === 'string' ? raw.id : null;
  if (!profileId) return null;

  const profile: SearchDirectoryPerson = {
    id: profileId,
    username: asString(raw.username),
    full_name: asString(raw.full_name),
    avatar_url: asString(raw.avatar_url),
    is_verified: asBoolean(raw.is_verified),
  };

  const ownerId = asString(raw.owner_id);
  const owner: SearchDirectoryOwner | null = ownerId
    ? {
        id: ownerId,
        username: asString(raw.owner_username),
        full_name: asString(raw.owner_full_name),
        avatar_url: asString(raw.owner_avatar_url),
        is_verified: asBoolean(raw.owner_is_verified),
      }
    : null;

  return {
    profile_id: profileId,
    business_name_normalized: asString(raw.business_name_normalized),
    profile,
    owner,
  };
}

/** Normalize RPC JSON into typed directory lists (people never include business profiles). */
export function parseSearchDirectoryPayload(payload: unknown): SearchDirectoryPayload {
  const root = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {};
  const peopleRaw = Array.isArray(root.people) ? root.people : [];
  const companiesRaw = Array.isArray(root.companies) ? root.companies : [];

  const people = peopleRaw
    .map((row) => parsePerson(row as RawPerson))
    .filter((row): row is SearchDirectoryPerson => row !== null);

  const companies = companiesRaw
    .map((row) => parseCompany(row as RawCompany))
    .filter((row): row is SearchDirectoryCompany => row !== null);

  const businessIds = new Set(companies.map((company) => company.profile_id));

  return {
    people: people.filter((person) => !businessIds.has(person.id)),
    companies,
  };
}
