# Social accounts and cross-publish

Org-gated publishing of Civizen feed posts to external networks **after** the post exists on Civizen (not simultaneous).

## Gate

Only the official Civizen organization account:

- Preferred: `linked_accounts.business_name_normalized = 'civizen'` and current profile is `linked_profile_id`
- Fallback: `profiles.username = 'civizen'`

Personal founder session (`@armen`) must not see Settings → Social accounts or Home **Publish to…**.

## Surfaces

| Surface | Behavior |
|---------|----------|
| Settings → **Social accounts** (`/settings/social-accounts`) | Connect / disconnect LinkedIn, Facebook, X |
| Home feed actions | Like · Comment · **Publish to…** (Share icon) on org-authored posts |
| Publish menu | Lists connected networks; unconnected rows link to Settings |

## Edge functions

- `social-accounts` — `status` / `oauth-start` / `disconnect` / `publish` (JWT + org gate)
- `social-oauth-callback` — browser OAuth redirect; stores tokens; redirects to `/settings/social-accounts`

## LinkedIn target

Company page organization id: `143053953` (`urn:li:organization:143053953`). Override with edge secret `LINKEDIN_ORGANIZATION_ID` if needed.

## Edge secrets (names only)

| Variable | Purpose |
|----------|---------|
| `LINKEDIN_CLIENT_ID` / `LINKEDIN_CLIENT_SECRET` | LinkedIn OAuth |
| `FACEBOOK_CLIENT_ID` / `FACEBOOK_CLIENT_SECRET` | Meta / Facebook Page OAuth |
| `X_CLIENT_ID` / `X_CLIENT_SECRET` | X (Twitter) OAuth |
| `SOCIAL_OAUTH_REDIRECT_URI` | Optional override; default `{SUPABASE_URL}/functions/v1/social-oauth-callback` |
| `CIVIZEN_PUBLIC_ORIGIN` | App origin for post-OAuth redirect (default `https://civizen.world`) |
| `LINKEDIN_ORGANIZATION_ID` | Optional override for company page id |

Do not commit secret values. Configure redirect URIs in each developer console to match `SOCIAL_OAUTH_REDIRECT_URI`.

## Tables

- `social_account_connections` — tokens (service-role only; no client SELECT of tokens)
- `social_crossposts` — publish audit (`post_id` + `provider` unique)
- `social_oauth_states` — short-lived OAuth CSRF state

## Migration

`supabase/migrations/20260803200000_social_account_connections.sql`
