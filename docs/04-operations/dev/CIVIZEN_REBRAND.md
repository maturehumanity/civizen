# Civizen rebrand notes

## GitHub

- Active development remote: `https://github.com/maturehumanity/civizen`.
- Archive remote: `legacy` → `maturehumanity/levela` (archived; README points here).

## Android

- `applicationId`: `com.civizen.app`. Install from `https://civizen.world/download`.

## Storage

- localStorage keys use `civizen-` / `civizen:` prefixes.
- On first load, `migrateLegacyBrandStorageKeys()` copies any remaining pre-rebrand `levela-` / `levela:` values once, then sets `civizen-storage-brand-migrated-v1`.
- Messaging E2EE IndexedDB physical name remains `civizen-messaging-e2ee` so existing device keys are not wiped.

## DIDs

- New and canonical DIDs: `did:civizen:…`.
- `normalizeCivizenDid` maps any leftover `did:levela:…` values to `did:civizen:…` when reading stored data.

## Legal content_ids

- Keep resolving historical content ids for existing rows.
- New publishes should use `civizen-*` ids when introducing new moderated documents.

## DB

- Canonical columns: `civizen_score`, `civizen_shared_proceeds_usd`, and Civizen-named identity helpers.
- Migration `20260723190000_rename_levela_identifiers_to_civizen.sql` performed the renames.
- Migration `20260723210000_drop_levela_compat_wrappers.sql` drops leftover Levela wrapper functions and brands public-audit webhook events as Civizen.
- **Frozen internal salts:** `private_get_or_create_*` conversation UUID v5 names still use historical `levela-dm:` / `levela-agent:` strings. Changing them would mint new conversation IDs and orphan existing threads. They are not user-visible.

## Hosting

- Public web root: `[production-web-root]` (nginx for `civizen.world`).
- Temporary redirect: `levela.yeremyan.net` → 301 → `civizen.world` (can remove when old traffic dies).
