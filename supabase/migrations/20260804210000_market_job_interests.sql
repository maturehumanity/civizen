-- Market Jobs interest submissions (seeker / employer progressive sentence form).

CREATE TABLE IF NOT EXISTS public.market_job_interests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mode text NOT NULL
    CHECK (mode IN ('seeker', 'employer')),
  job_types text[] NOT NULL DEFAULT '{}',
  city text,
  region_code text,
  country_code text,
  pay_amount text,
  pay_period text,
  full_name text NOT NULL DEFAULT '',
  company_name text,
  phone_country_code text,
  phone_number text,
  age text,
  days text[] NOT NULL DEFAULT '{}',
  hours_from text,
  hours_to text,
  terms text[] NOT NULL DEFAULT '{}',
  notes text,
  status text NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'reviewing', 'contacted', 'closed', 'spam')),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT market_job_interests_job_types_nonempty CHECK (cardinality(job_types) > 0),
  CONSTRAINT market_job_interests_full_name_nonempty CHECK (btrim(full_name) <> '')
);

CREATE INDEX IF NOT EXISTS market_job_interests_mode_created_idx
  ON public.market_job_interests (mode, created_at DESC);

CREATE INDEX IF NOT EXISTS market_job_interests_status_created_idx
  ON public.market_job_interests (status, created_at DESC);

CREATE INDEX IF NOT EXISTS market_job_interests_profile_created_idx
  ON public.market_job_interests (profile_id, created_at DESC);

ALTER TABLE public.market_job_interests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Signed-in members can submit market job interests" ON public.market_job_interests;
CREATE POLICY "Signed-in members can submit market job interests"
  ON public.market_job_interests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND cardinality(job_types) > 0
    AND btrim(full_name) <> ''
  );

DROP POLICY IF EXISTS "Members can read their own market job interests" ON public.market_job_interests;
CREATE POLICY "Members can read their own market job interests"
  ON public.market_job_interests
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can read market job interests" ON public.market_job_interests;
CREATE POLICY "Admins can read market job interests"
  ON public.market_job_interests
  FOR SELECT
  TO authenticated
  USING (
    public.has_permission('settings.manage'::public.app_permission)
    OR public.has_permission('role.assign'::public.app_permission)
  );

DROP POLICY IF EXISTS "Admins can update market job interests" ON public.market_job_interests;
CREATE POLICY "Admins can update market job interests"
  ON public.market_job_interests
  FOR UPDATE
  TO authenticated
  USING (
    public.has_permission('settings.manage'::public.app_permission)
    OR public.has_permission('role.assign'::public.app_permission)
  )
  WITH CHECK (
    public.has_permission('settings.manage'::public.app_permission)
    OR public.has_permission('role.assign'::public.app_permission)
  );

GRANT SELECT, INSERT ON public.market_job_interests TO authenticated;
GRANT SELECT, UPDATE ON public.market_job_interests TO authenticated;
