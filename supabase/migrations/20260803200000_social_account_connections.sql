-- Multi-provider social account connections for the official Civizen org profile.
-- Tokens are service-role only; clients use edge functions for status/connect/publish.

CREATE TABLE IF NOT EXISTS public.social_account_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('linkedin', 'facebook', 'x')),
  external_account_id text,
  external_account_name text,
  access_token text,
  refresh_token text,
  expires_at timestamptz,
  token_scopes text,
  status text NOT NULL DEFAULT 'connected'
    CHECK (status IN ('connected', 'revoked', 'error')),
  last_error text,
  connected_by_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_profile_id, provider)
);

CREATE INDEX IF NOT EXISTS social_account_connections_org_profile_id_idx
  ON public.social_account_connections (org_profile_id);

COMMENT ON TABLE public.social_account_connections IS
  'OAuth tokens for publishing Civizen org posts to LinkedIn, Facebook, and X. No client SELECT of token columns.';

CREATE TABLE IF NOT EXISTS public.social_crossposts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  org_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('linkedin', 'facebook', 'x')),
  external_post_id text,
  status text NOT NULL DEFAULT 'published'
    CHECK (status IN ('published', 'failed')),
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, provider)
);

CREATE INDEX IF NOT EXISTS social_crossposts_post_id_idx
  ON public.social_crossposts (post_id);

CREATE INDEX IF NOT EXISTS social_crossposts_org_profile_id_idx
  ON public.social_crossposts (org_profile_id);

COMMENT ON TABLE public.social_crossposts IS
  'Audit of Civizen feed posts published to external social networks.';

CREATE TABLE IF NOT EXISTS public.social_oauth_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('linkedin', 'facebook', 'x')),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '15 minutes')
);

CREATE INDEX IF NOT EXISTS social_oauth_states_expires_at_idx
  ON public.social_oauth_states (expires_at);

ALTER TABLE public.social_account_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_crossposts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_oauth_states ENABLE ROW LEVEL SECURITY;

-- No authenticated policies on connections (tokens). Service role bypasses RLS.
-- Org members may read crosspost status for their own posts.

DROP POLICY IF EXISTS "Org authors can read own social crossposts"
  ON public.social_crossposts;
CREATE POLICY "Org authors can read own social crossposts"
  ON public.social_crossposts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = social_crossposts.org_profile_id
        AND p.user_id = auth.uid()
    )
  );

DROP TRIGGER IF EXISTS update_social_account_connections_updated_at
  ON public.social_account_connections;
CREATE TRIGGER update_social_account_connections_updated_at
  BEFORE UPDATE ON public.social_account_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_social_crossposts_updated_at
  ON public.social_crossposts;
CREATE TRIGGER update_social_crossposts_updated_at
  BEFORE UPDATE ON public.social_crossposts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
