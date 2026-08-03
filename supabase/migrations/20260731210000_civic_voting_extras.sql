-- Civic voting extras (duress, observers, risk, assisted, challenges, canvass, attestation)
-- Design: docs/03-governance/civic-voting-system-design-v0.1.md §7

DO $$
BEGIN
  CREATE TYPE public.civic_challenge_status AS ENUM (
    'open',
    'upheld',
    'dismissed',
    'withdrawn'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public.civic_assisted_ballot_status AS ENUM (
    'draft',
    'awaiting_witness',
    'awaiting_steward',
    'accepted',
    'rejected',
    'voided'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public.civic_canvass_sample_status AS ENUM (
    'selected',
    'in_review',
    'cleared',
    'escalated'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public.civic_risk_severity AS ENUM (
    'info',
    'low',
    'medium',
    'high',
    'critical'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Challenge window on elections
ALTER TABLE public.civic_elections
  ADD COLUMN IF NOT EXISTS challenge_opens_at timestamptz,
  ADD COLUMN IF NOT EXISTS challenge_closes_at timestamptz,
  ADD COLUMN IF NOT EXISTS canvass_sample_rate numeric(5,4) NOT NULL DEFAULT 0.05
    CHECK (canvass_sample_rate >= 0 AND canvass_sample_rate <= 1);

-- 1. Duress PIN settings (hash only; never store plaintext)
CREATE TABLE IF NOT EXISTS public.civic_duress_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  duress_pin_hash text NOT NULL,
  pin_salt text NOT NULL,
  alert_enabled boolean NOT NULL DEFAULT true,
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Silent duress alerts (watcher-visible; never shown to the coerced UI path)
CREATE TABLE IF NOT EXISTS public.civic_duress_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id uuid REFERENCES public.civic_elections(id) ON DELETE SET NULL,
  session_id uuid REFERENCES public.civic_vote_sessions(id) ON DELETE SET NULL,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  acknowledged_at timestamptz,
  acknowledged_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Accredited observers
CREATE TABLE IF NOT EXISTS public.civic_election_observers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id uuid NOT NULL REFERENCES public.civic_elections(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  observer_role text NOT NULL DEFAULT 'watcher',
  accredited_at timestamptz NOT NULL DEFAULT now(),
  accredited_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (election_id, profile_id)
);

-- 3. Risk findings (no ballot content)
CREATE TABLE IF NOT EXISTS public.civic_risk_findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id uuid REFERENCES public.civic_elections(id) ON DELETE CASCADE,
  session_id uuid REFERENCES public.civic_vote_sessions(id) ON DELETE SET NULL,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  signal_key text NOT NULL,
  severity public.civic_risk_severity NOT NULL DEFAULT 'info',
  score numeric(6,4) NOT NULL DEFAULT 0,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Paper / assisted fallback (dual control)
CREATE TABLE IF NOT EXISTS public.civic_assisted_ballots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id uuid NOT NULL REFERENCES public.civic_elections(id) ON DELETE CASCADE,
  voter_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assistant_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  witness_profile_id uuid REFERENCES public.profiles(id) ON DELETE RESTRICT,
  steward_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  status public.civic_assisted_ballot_status NOT NULL DEFAULT 'draft',
  accessibility_reason text NOT NULL DEFAULT '',
  assistant_confirmed_at timestamptz,
  witness_confirmed_at timestamptz,
  steward_confirmed_at timestamptz,
  ballot_commitment text,
  audit_notes text NOT NULL DEFAULT '',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT civic_assisted_ballots_distinct_roles CHECK (
    voter_profile_id <> assistant_profile_id
    AND (witness_profile_id IS NULL OR (
      witness_profile_id <> voter_profile_id
      AND witness_profile_id <> assistant_profile_id
    ))
  )
);

-- 5. Candidate / measure challenges
CREATE TABLE IF NOT EXISTS public.civic_candidate_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id uuid NOT NULL REFERENCES public.civic_elections(id) ON DELETE CASCADE,
  contest_id uuid NOT NULL REFERENCES public.civic_contests(id) ON DELETE CASCADE,
  candidate_id uuid REFERENCES public.civic_candidates(id) ON DELETE SET NULL,
  challenger_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason text NOT NULL,
  status public.civic_challenge_status NOT NULL DEFAULT 'open',
  resolved_at timestamptz,
  resolved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolution_notes text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 7. Client attestation records (build hash / release channel)
CREATE TABLE IF NOT EXISTS public.civic_client_attestations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_registration_id uuid REFERENCES public.civic_device_registrations(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  app_version text NOT NULL,
  app_release_id text NOT NULL,
  android_version_code integer,
  package_fingerprint text,
  expected_release_id text,
  attestation_ok boolean NOT NULL DEFAULT false,
  checked_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 8. Post-election canvass samples (process audit only — no ballot choices)
CREATE TABLE IF NOT EXISTS public.civic_canvass_samples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id uuid NOT NULL REFERENCES public.civic_elections(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES public.civic_vote_sessions(id) ON DELETE CASCADE,
  status public.civic_canvass_sample_status NOT NULL DEFAULT 'selected',
  sample_bucket text NOT NULL DEFAULT 'random',
  auditor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  process_notes text NOT NULL DEFAULT '',
  reviewed_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (election_id, session_id)
);

CREATE INDEX IF NOT EXISTS idx_civic_duress_alerts_election
  ON public.civic_duress_alerts (election_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_civic_election_observers_election
  ON public.civic_election_observers (election_id, is_active);

CREATE INDEX IF NOT EXISTS idx_civic_risk_findings_election
  ON public.civic_risk_findings (election_id, severity, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_civic_assisted_ballots_election
  ON public.civic_assisted_ballots (election_id, status);

CREATE INDEX IF NOT EXISTS idx_civic_candidate_challenges_election
  ON public.civic_candidate_challenges (election_id, status);

CREATE INDEX IF NOT EXISTS idx_civic_canvass_samples_election
  ON public.civic_canvass_samples (election_id, status);

CREATE INDEX IF NOT EXISTS idx_civic_client_attestations_profile
  ON public.civic_client_attestations (profile_id, checked_at DESC);

DO $$
BEGIN
  CREATE TRIGGER update_civic_duress_settings_updated_at
    BEFORE UPDATE ON public.civic_duress_settings
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TRIGGER update_civic_assisted_ballots_updated_at
    BEFORE UPDATE ON public.civic_assisted_ballots
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TRIGGER update_civic_candidate_challenges_updated_at
    BEFORE UPDATE ON public.civic_candidate_challenges
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TRIGGER update_civic_canvass_samples_updated_at
    BEFORE UPDATE ON public.civic_canvass_samples
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.civic_duress_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.civic_duress_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.civic_election_observers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.civic_risk_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.civic_assisted_ballots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.civic_candidate_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.civic_client_attestations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.civic_canvass_samples ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Civic duress settings owner access" ON public.civic_duress_settings;
CREATE POLICY "Civic duress settings owner access"
  ON public.civic_duress_settings FOR ALL TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

-- Alerts: owner cannot SELECT (silent); stewards/observers via future RPC. Block client read.
DROP POLICY IF EXISTS "Civic duress alerts no owner read" ON public.civic_duress_alerts;
CREATE POLICY "Civic duress alerts no owner read"
  ON public.civic_duress_alerts FOR SELECT TO authenticated
  USING (false);

DROP POLICY IF EXISTS "Civic election observers readable by accredited" ON public.civic_election_observers;
CREATE POLICY "Civic election observers readable by accredited"
  ON public.civic_election_observers FOR SELECT TO authenticated
  USING (profile_id = auth.uid() OR true);

DROP POLICY IF EXISTS "Civic risk findings observer read aggregates only" ON public.civic_risk_findings;
CREATE POLICY "Civic risk findings observer read aggregates only"
  ON public.civic_risk_findings FOR SELECT TO authenticated
  USING (false);

DROP POLICY IF EXISTS "Civic assisted ballots participant read" ON public.civic_assisted_ballots;
CREATE POLICY "Civic assisted ballots participant read"
  ON public.civic_assisted_ballots FOR SELECT TO authenticated
  USING (
    voter_profile_id = auth.uid()
    OR assistant_profile_id = auth.uid()
    OR witness_profile_id = auth.uid()
    OR steward_profile_id = auth.uid()
  );

DROP POLICY IF EXISTS "Civic candidate challenges readable" ON public.civic_candidate_challenges;
CREATE POLICY "Civic candidate challenges readable"
  ON public.civic_candidate_challenges FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Civic candidate challenges insert own" ON public.civic_candidate_challenges;
CREATE POLICY "Civic candidate challenges insert own"
  ON public.civic_candidate_challenges FOR INSERT TO authenticated
  WITH CHECK (challenger_id = auth.uid());

DROP POLICY IF EXISTS "Civic client attestations owner access" ON public.civic_client_attestations;
CREATE POLICY "Civic client attestations owner access"
  ON public.civic_client_attestations FOR ALL TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

DROP POLICY IF EXISTS "Civic canvass samples no public pii" ON public.civic_canvass_samples;
CREATE POLICY "Civic canvass samples no public pii"
  ON public.civic_canvass_samples FOR SELECT TO authenticated
  USING (false);

GRANT SELECT, INSERT, UPDATE ON public.civic_duress_settings TO authenticated;
GRANT SELECT ON public.civic_election_observers TO authenticated;
GRANT SELECT ON public.civic_assisted_ballots TO authenticated;
GRANT SELECT, INSERT ON public.civic_candidate_challenges TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.civic_client_attestations TO authenticated;
