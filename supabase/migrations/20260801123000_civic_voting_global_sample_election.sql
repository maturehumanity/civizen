-- Civizen-wide (Global) sample election for the country-filter Global option.
-- Tagged sample_batch = public-historical-v1 for consistency with other test samples.
-- Idempotent on fixed UUIDs.

DELETE FROM public.civic_candidates
WHERE contest_id = 'b1110007-0000-4000-8000-000000000001';

DELETE FROM public.civic_contests
WHERE id = 'b1110007-0000-4000-8000-000000000001';

DELETE FROM public.civic_elections
WHERE id = 'a1110007-0000-4000-8000-000000000001';

INSERT INTO public.civic_elections (
  id, title, summary, body, tier, security_class, status,
  scope_country_code, scope_region_code, scope_locality_code,
  voting_opens_at, voting_closes_at,
  primary_window_seconds, max_attempts, retry_spacing_hours,
  require_home_presence, require_solitude, require_face_liveness,
  challenge_opens_at, challenge_closes_at, metadata
) VALUES (
  'a1110007-0000-4000-8000-000000000001',
  'Civizen Global Steward Seat (sample)',
  'Network-wide Civizen sample contest open to members in every country.',
  'Public sample for testing the Global location filter. This is a voluntary Civizen network process, not a public-law election or transfer of governmental authority.',
  'supranational', 'elevated', 'certified',
  'GLOBAL', NULL, NULL,
  '2025-01-01T12:00:00Z', '2026-12-31T23:59:00Z',
  600, 3, 48, false, false, true,
  '2024-12-01T00:00:00Z', '2024-12-28T00:00:00Z',
  '{"sample_batch":"public-historical-v1","scope":"global","office":"Civizen Global Steward (sample)","note":"Civizen test sample only — not a historical public-law election"}'::jsonb
);

INSERT INTO public.civic_contests (
  id, election_id, title, summary, contest_kind, office_key, seat_count, allow_abstain, sort_order, metadata
) VALUES (
  'b1110007-0000-4000-8000-000000000001',
  'a1110007-0000-4000-8000-000000000001',
  'Global Steward Seat',
  'Sample Civizen-wide office',
  'office',
  'civizen_global_steward',
  1,
  true,
  0,
  '{"sample_batch":"public-historical-v1"}'::jsonb
);

INSERT INTO public.civic_candidates (
  id, contest_id, display_name, statement, option_key, sort_order, metadata
) VALUES
(
  'c1110007-0000-4000-8000-000000000001',
  'b1110007-0000-4000-8000-000000000001',
  'Sample Candidate A',
  'Placeholder candidate for Global filter testing.',
  'sample_a',
  0,
  '{"sample_batch":"public-historical-v1"}'::jsonb
),
(
  'c1110007-0000-4000-8000-000000000002',
  'b1110007-0000-4000-8000-000000000001',
  'Sample Candidate B',
  'Placeholder candidate for Global filter testing.',
  'sample_b',
  1,
  '{"sample_batch":"public-historical-v1"}'::jsonb
);
