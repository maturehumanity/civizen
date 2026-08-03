-- Civic Voting System P0 schema
-- Design: docs/03-governance/civic-voting-system-design-v0.1.md
-- Sibling sibling to governance_proposals voting; not a replacement.

DO $$
BEGIN
  CREATE TYPE public.civic_election_tier AS ENUM (
    'neighborhood',
    'local',
    'district',
    'regional',
    'national',
    'supranational'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public.civic_election_security_class AS ENUM (
    'ordinary',
    'elevated',
    'constitutional'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public.civic_election_status AS ENUM (
    'draft',
    'scheduled',
    'open',
    'closed',
    'certified',
    'cancelled'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public.civic_contest_kind AS ENUM (
    'office',
    'measure',
    'open_nomination'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public.civic_vote_session_status AS ENUM (
    'scheduled',
    'notified',
    'in_progress',
    'cast',
    'missed',
    'failed',
    'voided',
    'exhausted'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public.civic_verification_check_kind AS ENUM (
    'eligibility',
    'device',
    'location_home',
    'solitude',
    'liveness',
    'face_match',
    'attestation'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public.civic_verification_check_result AS ENUM (
    'passed',
    'failed',
    'skipped',
    'inconclusive'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.civic_elections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  summary text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  tier public.civic_election_tier NOT NULL DEFAULT 'local',
  security_class public.civic_election_security_class NOT NULL DEFAULT 'ordinary',
  status public.civic_election_status NOT NULL DEFAULT 'draft',
  scope_country_code text,
  scope_region_code text,
  scope_locality_code text,
  voting_opens_at timestamptz NOT NULL,
  voting_closes_at timestamptz NOT NULL,
  primary_window_seconds integer NOT NULL DEFAULT 300
    CHECK (primary_window_seconds >= 60 AND primary_window_seconds <= 3600),
  max_attempts integer NOT NULL DEFAULT 3
    CHECK (max_attempts >= 1 AND max_attempts <= 5),
  retry_spacing_hours integer NOT NULL DEFAULT 48
    CHECK (retry_spacing_hours >= 24 AND retry_spacing_hours <= 168),
  require_home_presence boolean NOT NULL DEFAULT false,
  require_solitude boolean NOT NULL DEFAULT false,
  require_face_liveness boolean NOT NULL DEFAULT false,
  eligibility_roster_commitment text,
  ballot_box_commitment text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT civic_elections_window_check CHECK (voting_closes_at > voting_opens_at)
);

CREATE TABLE IF NOT EXISTS public.civic_contests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id uuid NOT NULL REFERENCES public.civic_elections(id) ON DELETE CASCADE,
  title text NOT NULL,
  summary text NOT NULL DEFAULT '',
  contest_kind public.civic_contest_kind NOT NULL DEFAULT 'office',
  office_key text,
  seat_count integer NOT NULL DEFAULT 1 CHECK (seat_count >= 1),
  allow_abstain boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.civic_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contest_id uuid NOT NULL REFERENCES public.civic_contests(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  statement text NOT NULL DEFAULT '',
  profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  option_key text,
  is_write_in_slot boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.civic_home_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT 'Home',
  country_code text,
  region_code text,
  locality_code text,
  address_line text,
  latitude double precision,
  longitude double precision,
  geofence_radius_meters integer NOT NULL DEFAULT 120
    CHECK (geofence_radius_meters >= 30 AND geofence_radius_meters <= 2000),
  presence_pattern jsonb NOT NULL DEFAULT '{}'::jsonb,
  consent_recorded_at timestamptz,
  cooling_off_until timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.civic_device_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('android', 'ios', 'web')),
  push_token text,
  device_fingerprint_hash text,
  attestation_status text NOT NULL DEFAULT 'unknown',
  attestation_checked_at timestamptz,
  last_seen_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_id, device_fingerprint_hash)
);

CREATE TABLE IF NOT EXISTS public.civic_voter_eligibility (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id uuid NOT NULL REFERENCES public.civic_elections(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  eligibility_hash text NOT NULL,
  is_eligible boolean NOT NULL DEFAULT true,
  reasons text[] NOT NULL DEFAULT '{}'::text[],
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (election_id, profile_id)
);

CREATE TABLE IF NOT EXISTS public.civic_vote_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id uuid NOT NULL REFERENCES public.civic_elections(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  attempt_number integer NOT NULL DEFAULT 1 CHECK (attempt_number >= 1),
  status public.civic_vote_session_status NOT NULL DEFAULT 'scheduled',
  scheduled_for timestamptz NOT NULL,
  notified_at timestamptz,
  window_opens_at timestamptz,
  window_closes_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  device_registration_id uuid REFERENCES public.civic_device_registrations(id) ON DELETE SET NULL,
  failure_reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (election_id, profile_id, attempt_number)
);

CREATE TABLE IF NOT EXISTS public.civic_verification_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.civic_vote_sessions(id) ON DELETE CASCADE,
  check_kind public.civic_verification_check_kind NOT NULL,
  result public.civic_verification_check_result NOT NULL,
  score numeric(6,4),
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.civic_ballots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id uuid NOT NULL REFERENCES public.civic_elections(id) ON DELETE CASCADE,
  session_id uuid NOT NULL UNIQUE REFERENCES public.civic_vote_sessions(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  ballot_commitment text NOT NULL,
  encrypted_payload text,
  inclusion_proof_salt text,
  is_countable boolean NOT NULL DEFAULT true,
  is_duress boolean NOT NULL DEFAULT false,
  cast_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (election_id, profile_id)
);

CREATE TABLE IF NOT EXISTS public.civic_ballot_selections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ballot_id uuid NOT NULL REFERENCES public.civic_ballots(id) ON DELETE CASCADE,
  contest_id uuid NOT NULL REFERENCES public.civic_contests(id) ON DELETE CASCADE,
  candidate_id uuid REFERENCES public.civic_candidates(id) ON DELETE SET NULL,
  selection_ciphertext text,
  is_abstain boolean NOT NULL DEFAULT false,
  rank integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ballot_id, contest_id)
);

CREATE TABLE IF NOT EXISTS public.civic_voting_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id uuid REFERENCES public.civic_elections(id) ON DELETE CASCADE,
  session_id uuid REFERENCES public.civic_vote_sessions(id) ON DELETE SET NULL,
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  prev_event_hash text,
  event_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_civic_elections_status_window
  ON public.civic_elections (status, voting_opens_at, voting_closes_at);

CREATE INDEX IF NOT EXISTS idx_civic_elections_scope
  ON public.civic_elections (tier, scope_country_code, security_class);

CREATE INDEX IF NOT EXISTS idx_civic_contests_election
  ON public.civic_contests (election_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_civic_candidates_contest
  ON public.civic_candidates (contest_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_civic_vote_sessions_profile
  ON public.civic_vote_sessions (profile_id, status, scheduled_for);

CREATE INDEX IF NOT EXISTS idx_civic_vote_sessions_election
  ON public.civic_vote_sessions (election_id, status, scheduled_for);

CREATE INDEX IF NOT EXISTS idx_civic_voter_eligibility_election
  ON public.civic_voter_eligibility (election_id, is_eligible);

CREATE INDEX IF NOT EXISTS idx_civic_verification_checks_session
  ON public.civic_verification_checks (session_id, check_kind);

CREATE INDEX IF NOT EXISTS idx_civic_voting_events_election
  ON public.civic_voting_events (election_id, created_at);

DO $$
BEGIN
  CREATE TRIGGER update_civic_elections_updated_at
    BEFORE UPDATE ON public.civic_elections
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TRIGGER update_civic_contests_updated_at
    BEFORE UPDATE ON public.civic_contests
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TRIGGER update_civic_candidates_updated_at
    BEFORE UPDATE ON public.civic_candidates
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TRIGGER update_civic_home_profiles_updated_at
    BEFORE UPDATE ON public.civic_home_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TRIGGER update_civic_device_registrations_updated_at
    BEFORE UPDATE ON public.civic_device_registrations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TRIGGER update_civic_vote_sessions_updated_at
    BEFORE UPDATE ON public.civic_vote_sessions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.civic_elections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.civic_contests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.civic_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.civic_home_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.civic_device_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.civic_voter_eligibility ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.civic_vote_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.civic_verification_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.civic_ballots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.civic_ballot_selections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.civic_voting_events ENABLE ROW LEVEL SECURITY;

-- Readable election metadata for authenticated members
DROP POLICY IF EXISTS "Civic elections readable by authenticated" ON public.civic_elections;
CREATE POLICY "Civic elections readable by authenticated"
  ON public.civic_elections FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Civic contests readable by authenticated" ON public.civic_contests;
CREATE POLICY "Civic contests readable by authenticated"
  ON public.civic_contests FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Civic candidates readable by authenticated" ON public.civic_candidates;
CREATE POLICY "Civic candidates readable by authenticated"
  ON public.civic_candidates FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Civic voting events readable by authenticated" ON public.civic_voting_events;
CREATE POLICY "Civic voting events readable by authenticated"
  ON public.civic_voting_events FOR SELECT TO authenticated
  USING (true);

-- Home / device / sessions / eligibility / ballots: owner only
DROP POLICY IF EXISTS "Civic home profiles owner access" ON public.civic_home_profiles;
CREATE POLICY "Civic home profiles owner access"
  ON public.civic_home_profiles FOR ALL TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

DROP POLICY IF EXISTS "Civic device registrations owner access" ON public.civic_device_registrations;
CREATE POLICY "Civic device registrations owner access"
  ON public.civic_device_registrations FOR ALL TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

DROP POLICY IF EXISTS "Civic voter eligibility owner read" ON public.civic_voter_eligibility;
CREATE POLICY "Civic voter eligibility owner read"
  ON public.civic_voter_eligibility FOR SELECT TO authenticated
  USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "Civic vote sessions owner access" ON public.civic_vote_sessions;
CREATE POLICY "Civic vote sessions owner access"
  ON public.civic_vote_sessions FOR SELECT TO authenticated
  USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "Civic verification checks owner read" ON public.civic_verification_checks;
CREATE POLICY "Civic verification checks owner read"
  ON public.civic_verification_checks FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.civic_vote_sessions s
      WHERE s.id = session_id AND s.profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Civic ballots owner read status only" ON public.civic_ballots;
CREATE POLICY "Civic ballots owner read status only"
  ON public.civic_ballots FOR SELECT TO authenticated
  USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "Civic ballot selections no direct client read" ON public.civic_ballot_selections;
CREATE POLICY "Civic ballot selections no direct client read"
  ON public.civic_ballot_selections FOR SELECT TO authenticated
  USING (false);

GRANT SELECT ON public.civic_elections TO authenticated;
GRANT SELECT ON public.civic_contests TO authenticated;
GRANT SELECT ON public.civic_candidates TO authenticated;
GRANT SELECT ON public.civic_voting_events TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.civic_home_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.civic_device_registrations TO authenticated;
GRANT SELECT ON public.civic_voter_eligibility TO authenticated;
GRANT SELECT ON public.civic_vote_sessions TO authenticated;
GRANT SELECT ON public.civic_verification_checks TO authenticated;
GRANT SELECT ON public.civic_ballots TO authenticated;
