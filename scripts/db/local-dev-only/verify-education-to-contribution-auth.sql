-- Local-only Slice 1 authorization checks.
-- Not for the remote application database.
--
-- Requires a local Supabase Postgres role that can SET ROLE authenticated
-- and four existing auth users with profiles:
--   :publisher_user_id   / :publisher_profile_id
--   :owner_user_id       / :owner_profile_id   (linked_accounts.owner → publisher)
--   :participant_user_id / :participant_profile_id
--   :stranger_user_id    / :stranger_profile_id
--
-- Substitute the placeholders, then run inside a transaction and ROLLBACK.

BEGIN;

-- 0) Linked-account owner of the publishing profile
INSERT INTO public.linked_accounts (owner_profile_id, linked_profile_id, relationship_type)
VALUES (:'owner_profile_id', :'publisher_profile_id', 'business')
ON CONFLICT DO NOTHING;

-- Helper: become an authenticated profile
--   SELECT set_config('request.jwt.claim.sub', :'user_id', true);
--   SELECT set_config('request.jwt.claims', json_build_object('sub', :'user_id', 'role', 'authenticated')::text, true);
--   SET LOCAL ROLE authenticated;

-- 1) Publisher creates a draft and an open opportunity
SELECT set_config('request.jwt.claim.sub', :'publisher_user_id', true);
SELECT set_config(
  'request.jwt.claims',
  json_build_object('sub', :'publisher_user_id', 'role', 'authenticated')::text,
  true
);
SET LOCAL ROLE authenticated;
SELECT public.create_contribution_opportunity(
  jsonb_build_object('title', 'Draft clinic note', 'summary', 'Internal draft only.', 'status', 'draft')
) AS draft_id;
SELECT public.create_contribution_opportunity(
  jsonb_build_object('title', 'Open clinic note', 'summary', 'Public contribution work.', 'status', 'open')
) AS open_id;
RESET ROLE;

-- 2) Unrelated authenticated profile: open readable, draft/applications/evidence/evaluations not
SELECT set_config('request.jwt.claim.sub', :'stranger_user_id', true);
SELECT set_config(
  'request.jwt.claims',
  json_build_object('sub', :'stranger_user_id', 'role', 'authenticated')::text,
  true
);
SET LOCAL ROLE authenticated;
-- Expect 1 row for the open opportunity, 0 for the draft.
SELECT id, status FROM public.contribution_opportunities WHERE status = 'open';
SELECT id FROM public.contribution_opportunities WHERE status = 'draft';
SELECT id FROM public.opportunity_participations;
SELECT id FROM public.opportunity_participation_evidence;
SELECT id FROM public.opportunity_evaluations;
RESET ROLE;

-- 3) Participant applies and can read only their participation/evidence
SELECT set_config('request.jwt.claim.sub', :'participant_user_id', true);
SELECT set_config(
  'request.jwt.claims',
  json_build_object('sub', :'participant_user_id', 'role', 'authenticated')::text,
  true
);
SET LOCAL ROLE authenticated;
SELECT public.apply_to_contribution_opportunity(
  (SELECT id FROM public.contribution_opportunities WHERE title = 'Open clinic note' LIMIT 1),
  'I can help.'
) AS participation_id;
SELECT id, participant_profile_id FROM public.opportunity_participations;
-- Expect empty: participant is not an organizer
SELECT * FROM public.list_opportunity_applicant_identities(
  (SELECT id FROM public.contribution_opportunities WHERE title = 'Open clinic note' LIMIT 1)
);
RESET ROLE;

-- 4) Publisher accepts, participant starts/submits evidence
SELECT set_config('request.jwt.claim.sub', :'publisher_user_id', true);
SELECT set_config(
  'request.jwt.claims',
  json_build_object('sub', :'publisher_user_id', 'role', 'authenticated')::text,
  true
);
SET LOCAL ROLE authenticated;
SELECT public.review_opportunity_application(
  (SELECT id FROM public.opportunity_participations LIMIT 1),
  'accept',
  NULL
);
RESET ROLE;

SELECT set_config('request.jwt.claim.sub', :'participant_user_id', true);
SELECT set_config(
  'request.jwt.claims',
  json_build_object('sub', :'participant_user_id', 'role', 'authenticated')::text,
  true
);
SET LOCAL ROLE authenticated;
SELECT public.start_opportunity_work((SELECT id FROM public.opportunity_participations LIMIT 1));
SELECT public.add_opportunity_evidence(
  (SELECT id FROM public.opportunity_participations LIMIT 1),
  'Wrote the intake note.',
  'https://example.test/note',
  NULL
);
SELECT public.submit_opportunity_work((SELECT id FROM public.opportunity_participations LIMIT 1));
RESET ROLE;

-- 5) Linked-account owner can read participants and identity
SELECT set_config('request.jwt.claim.sub', :'owner_user_id', true);
SELECT set_config(
  'request.jwt.claims',
  json_build_object('sub', :'owner_user_id', 'role', 'authenticated')::text,
  true
);
SET LOCAL ROLE authenticated;
SELECT id FROM public.opportunity_participations;
SELECT * FROM public.list_opportunity_applicant_identities(
  (SELECT id FROM public.contribution_opportunities WHERE title = 'Open clinic note' LIMIT 1)
);
RESET ROLE;

-- 6) Unrelated profile cannot invoke organizer RPCs — expect not_authorized
SELECT set_config('request.jwt.claim.sub', :'stranger_user_id', true);
SELECT set_config(
  'request.jwt.claims',
  json_build_object('sub', :'stranger_user_id', 'role', 'authenticated')::text,
  true
);
SET LOCAL ROLE authenticated;
SELECT public.review_opportunity_application(
  (SELECT id FROM public.opportunity_participations LIMIT 1),
  'decline',
  NULL
);
RESET ROLE;

-- 7) Participant cannot evaluate own work — expect self_evaluation_forbidden
SELECT set_config('request.jwt.claim.sub', :'participant_user_id', true);
SELECT set_config(
  'request.jwt.claims',
  json_build_object('sub', :'participant_user_id', 'role', 'authenticated')::text,
  true
);
SET LOCAL ROLE authenticated;
SELECT public.evaluate_opportunity_work(
  (SELECT id FROM public.opportunity_participations LIMIT 1),
  'verified',
  NULL, NULL, NULL, '{}'::text[]
);
RESET ROLE;

-- 8) Verified completion + repeated projection → exactly one score event
SELECT set_config('request.jwt.claim.sub', :'publisher_user_id', true);
SELECT set_config(
  'request.jwt.claims',
  json_build_object('sub', :'publisher_user_id', 'role', 'authenticated')::text,
  true
);
SET LOCAL ROLE authenticated;
SELECT public.evaluate_opportunity_work(
  (SELECT id FROM public.opportunity_participations LIMIT 1),
  'verified',
  'Clear write-up.',
  80,
  70,
  ARRAY['Documentation']
);
SELECT public.project_opportunity_contribution_event(
  (SELECT id FROM public.opportunity_participations LIMIT 1)
);
SELECT public.project_opportunity_contribution_event(
  (SELECT id FROM public.opportunity_participations LIMIT 1)
);
RESET ROLE;

SELECT count(*) AS projected_events
FROM public.profile_contribution_events
WHERE source_table = 'opportunity_participations'
  AND source_id = (SELECT id::text FROM public.opportunity_participations LIMIT 1);
-- Expect projected_events = 1

ROLLBACK;
