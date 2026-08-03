-- Civic voting SAMPLE DATA for testing only.
-- Sources are publicly documented historical elections (Wikipedia / official returns).
-- Civizen does NOT claim these are platform-authorized public-law elections.
-- Idempotent: removes prior rows tagged metadata.sample_batch = 'public-historical-v1'

DELETE FROM public.civic_ballot_selections
WHERE ballot_id IN (
  SELECT b.id FROM public.civic_ballots b
  JOIN public.civic_elections e ON e.id = b.election_id
  WHERE e.metadata->>'sample_batch' = 'public-historical-v1'
);

DELETE FROM public.civic_ballots
WHERE election_id IN (
  SELECT id FROM public.civic_elections WHERE metadata->>'sample_batch' = 'public-historical-v1'
);

DELETE FROM public.civic_verification_checks
WHERE session_id IN (
  SELECT s.id FROM public.civic_vote_sessions s
  JOIN public.civic_elections e ON e.id = s.election_id
  WHERE e.metadata->>'sample_batch' = 'public-historical-v1'
);

DELETE FROM public.civic_vote_sessions
WHERE election_id IN (
  SELECT id FROM public.civic_elections WHERE metadata->>'sample_batch' = 'public-historical-v1'
);

DELETE FROM public.civic_voter_eligibility
WHERE election_id IN (
  SELECT id FROM public.civic_elections WHERE metadata->>'sample_batch' = 'public-historical-v1'
);

DELETE FROM public.civic_voting_events
WHERE election_id IN (
  SELECT id FROM public.civic_elections WHERE metadata->>'sample_batch' = 'public-historical-v1'
);

DELETE FROM public.civic_candidate_challenges
WHERE election_id IN (
  SELECT id FROM public.civic_elections WHERE metadata->>'sample_batch' = 'public-historical-v1'
);

DELETE FROM public.civic_candidates
WHERE contest_id IN (
  SELECT c.id FROM public.civic_contests c
  JOIN public.civic_elections e ON e.id = c.election_id
  WHERE e.metadata->>'sample_batch' = 'public-historical-v1'
);

DELETE FROM public.civic_contests
WHERE election_id IN (
  SELECT id FROM public.civic_elections WHERE metadata->>'sample_batch' = 'public-historical-v1'
);

DELETE FROM public.civic_elections
WHERE metadata->>'sample_batch' = 'public-historical-v1';

-- Fixed UUIDs for stable deep-links in testing.
-- Elections: a111... ; contests: b111... ; candidates: c111...

INSERT INTO public.civic_elections (
  id, title, summary, body, tier, security_class, status,
  scope_country_code, scope_region_code, scope_locality_code,
  voting_opens_at, voting_closes_at,
  primary_window_seconds, max_attempts, retry_spacing_hours,
  require_home_presence, require_solitude, require_face_liveness,
  challenge_opens_at, challenge_closes_at, metadata
) VALUES
-- ===================== NEIGHBORHOOD (3) =====================
(
  'a1110001-0000-4000-8000-000000000001',
  'Chicago 4th Ward Alderman (2023)',
  'City Council ward election — Chicago 4th Ward.',
  'Public historical sample. Source: 2023 Chicago aldermanic election (Ward 4).',
  'neighborhood', 'ordinary', 'certified',
  'US', 'IL', 'Chicago-Ward-4',
  '2023-02-28T14:00:00Z', '2023-02-28T23:59:00Z',
  900, 3, 48, false, false, false,
  '2023-01-01T00:00:00Z', '2023-02-21T00:00:00Z',
  '{"sample_batch":"public-historical-v1","source":"wikipedia","source_title":"2023 Chicago aldermanic election","office":"Alderman, Ward 4","note":"Civizen test sample only"}'::jsonb
),
(
  'a1110001-0000-4000-8000-000000000002',
  'NYC City Council District 39 (2021)',
  'Neighborhood-scale city council district race in Brooklyn.',
  'Public historical sample. Source: 2021 New York City Council election, District 39.',
  'neighborhood', 'ordinary', 'certified',
  'US', 'NY', 'NYC-CD-39',
  '2021-11-02T14:00:00Z', '2021-11-02T23:59:00Z',
  900, 3, 48, false, false, false,
  '2021-09-01T00:00:00Z', '2021-10-26T00:00:00Z',
  '{"sample_batch":"public-historical-v1","source":"wikipedia","source_title":"2021 New York City Council election","office":"City Council Member, District 39","note":"Civizen test sample only"}'::jsonb
),
(
  'a1110001-0000-4000-8000-000000000003',
  'Boston City Council District 7 (2021)',
  'District council seat covering Roxbury and surrounding neighborhoods.',
  'Public historical sample. Source: 2021 Boston City Council election, District 7.',
  'neighborhood', 'ordinary', 'certified',
  'US', 'MA', 'Boston-D7',
  '2021-11-02T14:00:00Z', '2021-11-02T23:59:00Z',
  900, 3, 48, false, false, false,
  '2021-09-01T00:00:00Z', '2021-10-26T00:00:00Z',
  '{"sample_batch":"public-historical-v1","source":"wikipedia","source_title":"2021 Boston City Council election","office":"City Councilor, District 7","note":"Civizen test sample only"}'::jsonb
),

-- ===================== LOCAL (3) =====================
(
  'a1110002-0000-4000-8000-000000000001',
  'New York City Mayor (2021)',
  'Municipal mayoral general election.',
  'Public historical sample. Source: 2021 New York City mayoral election. Democratic nominee Eric Adams defeated Republican Curtis Sliwa.',
  'local', 'elevated', 'certified',
  'US', 'NY', 'New York City',
  '2021-11-02T14:00:00Z', '2021-11-02T23:59:00Z',
  300, 3, 48, true, false, true,
  '2021-09-01T00:00:00Z', '2021-10-26T00:00:00Z',
  '{"sample_batch":"public-historical-v1","source":"wikipedia","source_title":"2021 New York City mayoral election","office":"Mayor of New York City","note":"Civizen test sample only"}'::jsonb
),
(
  'a1110002-0000-4000-8000-000000000002',
  'London Mayor (2024)',
  'Greater London Authority mayoral election.',
  'Public historical sample. Source: 2024 London mayoral election. Labour incumbent Sadiq Khan won a third term.',
  'local', 'elevated', 'certified',
  'GB', 'ENG', 'Greater London',
  '2024-05-02T07:00:00Z', '2024-05-02T21:00:00Z',
  300, 3, 48, true, false, true,
  '2024-03-01T00:00:00Z', '2024-04-25T00:00:00Z',
  '{"sample_batch":"public-historical-v1","source":"wikipedia","source_title":"2024 London mayoral election","office":"Mayor of London","note":"Civizen test sample only"}'::jsonb
),
(
  'a1110002-0000-4000-8000-000000000003',
  'Chicago Mayor (2023 runoff)',
  'Municipal mayoral runoff election.',
  'Public historical sample. Source: 2023 Chicago mayoral election runoff between Brandon Johnson and Paul Vallas.',
  'local', 'elevated', 'certified',
  'US', 'IL', 'Chicago',
  '2023-04-04T14:00:00Z', '2023-04-04T23:59:00Z',
  300, 3, 48, true, false, true,
  '2023-02-15T00:00:00Z', '2023-03-28T00:00:00Z',
  '{"sample_batch":"public-historical-v1","source":"wikipedia","source_title":"2023 Chicago mayoral election","office":"Mayor of Chicago","note":"Civizen test sample only"}'::jsonb
),

-- ===================== DISTRICT (3) =====================
(
  'a1110003-0000-4000-8000-000000000001',
  'U.S. Senate — California (2024)',
  'Statewide class of U.S. Senate (modeled here as district-tier legislative seat).',
  'Public historical sample. Source: 2024 United States Senate election in California. Adam Schiff defeated Steve Garvey.',
  'district', 'elevated', 'certified',
  'US', 'CA', NULL,
  '2024-11-05T15:00:00Z', '2024-11-05T23:59:00Z',
  300, 3, 48, true, false, true,
  '2024-09-01T00:00:00Z', '2024-10-29T00:00:00Z',
  '{"sample_batch":"public-historical-v1","source":"wikipedia","source_title":"2024 United States Senate election in California","office":"U.S. Senator from California","note":"Civizen test sample only"}'::jsonb
),
(
  'a1110003-0000-4000-8000-000000000002',
  'U.S. Senate — Pennsylvania (2024)',
  'U.S. Senate election in Pennsylvania.',
  'Public historical sample. Source: 2024 United States Senate election in Pennsylvania. Dave McCormick defeated Bob Casey Jr.',
  'district', 'elevated', 'certified',
  'US', 'PA', NULL,
  '2024-11-05T15:00:00Z', '2024-11-05T23:59:00Z',
  300, 3, 48, true, false, true,
  '2024-09-01T00:00:00Z', '2024-10-29T00:00:00Z',
  '{"sample_batch":"public-historical-v1","source":"wikipedia","source_title":"2024 United States Senate election in Pennsylvania","office":"U.S. Senator from Pennsylvania","note":"Civizen test sample only"}'::jsonb
),
(
  'a1110003-0000-4000-8000-000000000003',
  'U.S. Senate — Ohio (2024)',
  'U.S. Senate election in Ohio.',
  'Public historical sample. Source: 2024 United States Senate election in Ohio. Bernie Moreno defeated Sherrod Brown.',
  'district', 'elevated', 'certified',
  'US', 'OH', NULL,
  '2024-11-05T15:00:00Z', '2024-11-05T23:59:00Z',
  300, 3, 48, true, false, true,
  '2024-09-01T00:00:00Z', '2024-10-29T00:00:00Z',
  '{"sample_batch":"public-historical-v1","source":"wikipedia","source_title":"2024 United States Senate election in Ohio","office":"U.S. Senator from Ohio","note":"Civizen test sample only"}'::jsonb
),

-- ===================== REGIONAL (3) =====================
(
  'a1110004-0000-4000-8000-000000000001',
  'California Governor (2022)',
  'State gubernatorial election.',
  'Public historical sample. Source: 2022 California gubernatorial election. Gavin Newsom defeated Brian Dahle.',
  'regional', 'elevated', 'certified',
  'US', 'CA', NULL,
  '2022-11-08T15:00:00Z', '2022-11-08T23:59:00Z',
  300, 3, 48, true, false, true,
  '2022-09-01T00:00:00Z', '2022-11-01T00:00:00Z',
  '{"sample_batch":"public-historical-v1","source":"wikipedia","source_title":"2022 California gubernatorial election","office":"Governor of California","note":"Civizen test sample only"}'::jsonb
),
(
  'a1110004-0000-4000-8000-000000000002',
  'New York Governor (2022)',
  'State gubernatorial election.',
  'Public historical sample. Source: 2022 New York gubernatorial election. Kathy Hochul defeated Lee Zeldin.',
  'regional', 'elevated', 'certified',
  'US', 'NY', NULL,
  '2022-11-08T15:00:00Z', '2022-11-08T23:59:00Z',
  300, 3, 48, true, false, true,
  '2022-09-01T00:00:00Z', '2022-11-01T00:00:00Z',
  '{"sample_batch":"public-historical-v1","source":"wikipedia","source_title":"2022 New York gubernatorial election","office":"Governor of New York","note":"Civizen test sample only"}'::jsonb
),
(
  'a1110004-0000-4000-8000-000000000003',
  'Texas Governor (2022)',
  'State gubernatorial election.',
  'Public historical sample. Source: 2022 Texas gubernatorial election. Greg Abbott defeated Beto O''Rourke.',
  'regional', 'elevated', 'certified',
  'US', 'TX', NULL,
  '2022-11-08T15:00:00Z', '2022-11-08T23:59:00Z',
  300, 3, 48, true, false, true,
  '2022-09-01T00:00:00Z', '2022-11-01T00:00:00Z',
  '{"sample_batch":"public-historical-v1","source":"wikipedia","source_title":"2022 Texas gubernatorial election","office":"Governor of Texas","note":"Civizen test sample only"}'::jsonb
),

-- ===================== NATIONAL (3) =====================
(
  'a1110005-0000-4000-8000-000000000001',
  'United States President (2024)',
  'National executive election.',
  'Public historical sample. Source: 2024 United States presidential election. Republican ticket Trump/Vance defeated Democratic ticket Harris/Walz. Also lists major third-party/independent tickets with ballot presence.',
  'national', 'constitutional', 'certified',
  'US', NULL, NULL,
  '2024-11-05T15:00:00Z', '2024-11-05T23:59:00Z',
  300, 3, 48, true, true, true,
  '2024-09-01T00:00:00Z', '2024-10-29T00:00:00Z',
  '{"sample_batch":"public-historical-v1","source":"wikipedia","source_title":"2024 United States presidential election","office":"President of the United States","note":"Civizen test sample only"}'::jsonb
),
(
  'a1110005-0000-4000-8000-000000000002',
  'France President (2022)',
  'National executive election (first-round major candidates).',
  'Public historical sample. Source: 2022 French presidential election. First-round leading candidates; runoff won by Emmanuel Macron over Marine Le Pen.',
  'national', 'constitutional', 'certified',
  'FR', NULL, NULL,
  '2022-04-10T06:00:00Z', '2022-04-10T18:00:00Z',
  300, 3, 48, true, true, true,
  '2022-02-01T00:00:00Z', '2022-04-03T00:00:00Z',
  '{"sample_batch":"public-historical-v1","source":"wikipedia","source_title":"2022 French presidential election","office":"President of France","round":"first","note":"Civizen test sample only"}'::jsonb
),
(
  'a1110005-0000-4000-8000-000000000003',
  'Brazil President (2022)',
  'National executive election (first round / runoff field).',
  'Public historical sample. Source: 2022 Brazilian presidential election. Luiz Inácio Lula da Silva defeated Jair Bolsonaro in the runoff.',
  'national', 'constitutional', 'certified',
  'BR', NULL, NULL,
  '2022-10-02T12:00:00Z', '2022-10-02T21:00:00Z',
  300, 3, 48, true, true, true,
  '2022-08-01T00:00:00Z', '2022-09-25T00:00:00Z',
  '{"sample_batch":"public-historical-v1","source":"wikipedia","source_title":"2022 Brazilian presidential election","office":"President of Brazil","note":"Civizen test sample only"}'::jsonb
),

-- ===================== SUPRANATIONAL (3) =====================
(
  'a1110006-0000-4000-8000-000000000001',
  'European Parliament — France (2024)',
  'Supranational legislature (French constituency list heads).',
  'Public historical sample. Source: 2024 European Parliament election in France — major list heads published in Journal officiel / Toute l''Europe.',
  'supranational', 'elevated', 'certified',
  'FR', 'EU', NULL,
  '2024-06-09T06:00:00Z', '2024-06-09T18:00:00Z',
  300, 3, 48, true, false, true,
  '2024-04-01T00:00:00Z', '2024-06-02T00:00:00Z',
  '{"sample_batch":"public-historical-v1","source":"touteleurope.eu / Journal officiel","source_title":"2024 European Parliament election in France","office":"Members of the European Parliament (France)","note":"Civizen test sample only — list heads"}'::jsonb
),
(
  'a1110006-0000-4000-8000-000000000002',
  'European Parliament — Germany (2024)',
  'Supranational legislature (German lead candidates / Spitzenkandidaten).',
  'Public historical sample. Source: 2024 European Parliament election in Germany — major party lead candidates.',
  'supranational', 'elevated', 'certified',
  'DE', 'EU', NULL,
  '2024-06-09T06:00:00Z', '2024-06-09T18:00:00Z',
  300, 3, 48, true, false, true,
  '2024-04-01T00:00:00Z', '2024-06-02T00:00:00Z',
  '{"sample_batch":"public-historical-v1","source":"wikipedia","source_title":"2024 European Parliament election in Germany","office":"Members of the European Parliament (Germany)","note":"Civizen test sample only — party leads"}'::jsonb
),
(
  'a1110006-0000-4000-8000-000000000003',
  'European Parliament — Italy (2024)',
  'Supranational legislature (Italian list leaders).',
  'Public historical sample. Source: 2024 European Parliament election in Italy — major coalition/list leaders.',
  'supranational', 'elevated', 'certified',
  'IT', 'EU', NULL,
  '2024-06-08T06:00:00Z', '2024-06-09T21:00:00Z',
  300, 3, 48, true, false, true,
  '2024-04-01T00:00:00Z', '2024-06-01T00:00:00Z',
  '{"sample_batch":"public-historical-v1","source":"wikipedia","source_title":"2024 European Parliament election in Italy","office":"Members of the European Parliament (Italy)","note":"Civizen test sample only — list leaders"}'::jsonb
);

-- Contests (one office contest per election)
INSERT INTO public.civic_contests (
  id, election_id, title, summary, contest_kind, office_key, seat_count, allow_abstain, sort_order, metadata
) VALUES
('b1110001-0000-4000-8000-000000000001', 'a1110001-0000-4000-8000-000000000001', 'Alderman — Ward 4', 'Chicago City Council Ward 4', 'office', 'alderman_ward_4', 1, true, 0, '{"sample_batch":"public-historical-v1"}'::jsonb),
('b1110001-0000-4000-8000-000000000002', 'a1110001-0000-4000-8000-000000000002', 'City Council — District 39', 'NYC Council District 39', 'office', 'nyc_council_d39', 1, true, 0, '{"sample_batch":"public-historical-v1"}'::jsonb),
('b1110001-0000-4000-8000-000000000003', 'a1110001-0000-4000-8000-000000000003', 'City Council — District 7', 'Boston City Council District 7', 'office', 'boston_council_d7', 1, true, 0, '{"sample_batch":"public-historical-v1"}'::jsonb),
('b1110002-0000-4000-8000-000000000001', 'a1110002-0000-4000-8000-000000000001', 'Mayor of New York City', 'General election ballot', 'office', 'nyc_mayor', 1, true, 0, '{"sample_batch":"public-historical-v1"}'::jsonb),
('b1110002-0000-4000-8000-000000000002', 'a1110002-0000-4000-8000-000000000002', 'Mayor of London', 'GLA mayoral ballot', 'office', 'london_mayor', 1, true, 0, '{"sample_batch":"public-historical-v1"}'::jsonb),
('b1110002-0000-4000-8000-000000000003', 'a1110002-0000-4000-8000-000000000003', 'Mayor of Chicago', 'Runoff ballot', 'office', 'chicago_mayor', 1, true, 0, '{"sample_batch":"public-historical-v1"}'::jsonb),
('b1110003-0000-4000-8000-000000000001', 'a1110003-0000-4000-8000-000000000001', 'U.S. Senator — California', 'General election', 'office', 'us_senate_ca', 1, true, 0, '{"sample_batch":"public-historical-v1"}'::jsonb),
('b1110003-0000-4000-8000-000000000002', 'a1110003-0000-4000-8000-000000000002', 'U.S. Senator — Pennsylvania', 'General election', 'office', 'us_senate_pa', 1, true, 0, '{"sample_batch":"public-historical-v1"}'::jsonb),
('b1110003-0000-4000-8000-000000000003', 'a1110003-0000-4000-8000-000000000003', 'U.S. Senator — Ohio', 'General election', 'office', 'us_senate_oh', 1, true, 0, '{"sample_batch":"public-historical-v1"}'::jsonb),
('b1110004-0000-4000-8000-000000000001', 'a1110004-0000-4000-8000-000000000001', 'Governor of California', 'General election', 'office', 'governor_ca', 1, true, 0, '{"sample_batch":"public-historical-v1"}'::jsonb),
('b1110004-0000-4000-8000-000000000002', 'a1110004-0000-4000-8000-000000000002', 'Governor of New York', 'General election', 'office', 'governor_ny', 1, true, 0, '{"sample_batch":"public-historical-v1"}'::jsonb),
('b1110004-0000-4000-8000-000000000003', 'a1110004-0000-4000-8000-000000000003', 'Governor of Texas', 'General election', 'office', 'governor_tx', 1, true, 0, '{"sample_batch":"public-historical-v1"}'::jsonb),
('b1110005-0000-4000-8000-000000000001', 'a1110005-0000-4000-8000-000000000001', 'President of the United States', 'Presidential ticket', 'office', 'us_president', 1, true, 0, '{"sample_batch":"public-historical-v1"}'::jsonb),
('b1110005-0000-4000-8000-000000000002', 'a1110005-0000-4000-8000-000000000002', 'President of France', 'First-round field (major candidates)', 'office', 'fr_president', 1, true, 0, '{"sample_batch":"public-historical-v1"}'::jsonb),
('b1110005-0000-4000-8000-000000000003', 'a1110005-0000-4000-8000-000000000003', 'President of Brazil', 'First-round major candidates', 'office', 'br_president', 1, true, 0, '{"sample_batch":"public-historical-v1"}'::jsonb),
('b1110006-0000-4000-8000-000000000001', 'a1110006-0000-4000-8000-000000000001', 'European Parliament — France lists', 'Vote for a list (heads shown)', 'office', 'ep_fr_2024', 81, true, 0, '{"sample_batch":"public-historical-v1","ballot_form":"party_list_heads"}'::jsonb),
('b1110006-0000-4000-8000-000000000002', 'a1110006-0000-4000-8000-000000000002', 'European Parliament — Germany lists', 'Vote for a list (leads shown)', 'office', 'ep_de_2024', 96, true, 0, '{"sample_batch":"public-historical-v1","ballot_form":"party_list_heads"}'::jsonb),
('b1110006-0000-4000-8000-000000000003', 'a1110006-0000-4000-8000-000000000003', 'European Parliament — Italy lists', 'Vote for a list (leaders shown)', 'office', 'ep_it_2024', 76, true, 0, '{"sample_batch":"public-historical-v1","ballot_form":"party_list_heads"}'::jsonb);

-- Candidates
INSERT INTO public.civic_candidates (
  id, contest_id, display_name, statement, option_key, sort_order, metadata
) VALUES
-- Chicago Ward 4 (2023) — publicly reported field; Lamont Robinson won
('c1110001-0000-4000-8000-000000000001', 'b1110001-0000-4000-8000-000000000001', 'Lamont Robinson', 'Democratic / nonpartisan ballot. State representative; won the April 4, 2023 runoff for Chicago 4th Ward Alderman (66.32%).', 'lamont_robinson', 0, '{"party":"Nonpartisan","sample_batch":"public-historical-v1","source":"Chicago Board of Elections / Ballotpedia"}'::jsonb),
('c1110001-0000-4000-8000-000000000002', 'b1110001-0000-4000-8000-000000000001', 'Prentice Butler', 'Chief of staff to outgoing Ald. Sophia King; advanced to and lost the April 4, 2023 runoff.', 'prentice_butler', 1, '{"sample_batch":"public-historical-v1","source":"Chicago Board of Elections / Ballotpedia"}'::jsonb),
('c1110001-0000-4000-8000-000000000003', 'b1110001-0000-4000-8000-000000000001', 'Ebony Lucas', 'Finished third in the February 28, 2023 first round (narrowly behind Butler).', 'ebony_lucas', 2, '{"sample_batch":"public-historical-v1","source":"Ballotpedia"}'::jsonb),
('c1110001-0000-4000-8000-000000000004', 'b1110001-0000-4000-8000-000000000001', 'Matthew Humphries', 'First-round candidate, February 28, 2023.', 'matthew_humphries', 3, '{"sample_batch":"public-historical-v1","source":"Ballotpedia"}'::jsonb),
('c1110001-0000-4000-8000-000000000005', 'b1110001-0000-4000-8000-000000000001', 'Tracey Y. Bey', 'First-round candidate, February 28, 2023.', 'tracey_y_bey', 4, '{"sample_batch":"public-historical-v1","source":"Ballotpedia"}'::jsonb),
('c1110001-0000-4000-8000-000000000006', 'b1110001-0000-4000-8000-000000000001', 'Helen West', 'First-round candidate, February 28, 2023.', 'helen_west', 5, '{"sample_batch":"public-historical-v1","source":"Ballotpedia"}'::jsonb),

-- NYC CD 39 (2021) — Shahana Hanif won
('c1110001-0000-4000-8000-000000000011', 'b1110001-0000-4000-8000-000000000002', 'Shahana Hanif', 'Democratic / Working Families. Elected NYC Council Member for District 39 (2021 general).', 'shahana_hanif', 0, '{"party":"Democratic","sample_batch":"public-historical-v1","source":"vote.nyc / Wikipedia"}'::jsonb),
('c1110001-0000-4000-8000-000000000012', 'b1110001-0000-4000-8000-000000000002', 'Brandon West', 'Democratic primary finalist (RCV) against Hanif.', 'brandon_west', 1, '{"party":"Democratic","contest_phase":"primary_context","sample_batch":"public-historical-v1"}'::jsonb),
('c1110001-0000-4000-8000-000000000013', 'b1110001-0000-4000-8000-000000000002', 'Justin Krebs', 'Democratic primary candidate (2021).', 'justin_krebs', 2, '{"party":"Democratic","contest_phase":"primary_context","sample_batch":"public-historical-v1"}'::jsonb),
('c1110001-0000-4000-8000-000000000014', 'b1110001-0000-4000-8000-000000000002', 'Brett Wynkoop', 'Conservative Party nominee in the 2021 general election.', 'brett_wynkoop', 3, '{"party":"Conservative","sample_batch":"public-historical-v1"}'::jsonb),
('c1110001-0000-4000-8000-000000000015', 'b1110001-0000-4000-8000-000000000002', 'Matthew Morgan', 'Libertarian nominee in the 2021 general election.', 'matthew_morgan', 4, '{"party":"Libertarian","sample_batch":"public-historical-v1"}'::jsonb),

-- Boston D7 (2021) — Tania Fernandes Anderson won
('c1110001-0000-4000-8000-000000000021', 'b1110001-0000-4000-8000-000000000003', 'Tania Fernandes Anderson', 'Elected Boston City Councilor for District 7 (2021 general, 73.0%).', 'tania_fernandes_anderson', 0, '{"sample_batch":"public-historical-v1","source":"Wikipedia / Ballotpedia"}'::jsonb),
('c1110001-0000-4000-8000-000000000022', 'b1110001-0000-4000-8000-000000000003', 'Roy Owens Sr.', 'Advanced from the preliminary; finished second in the 2021 general (26.5%).', 'roy_owens_sr', 1, '{"sample_batch":"public-historical-v1","source":"Wikipedia"}'::jsonb),
('c1110001-0000-4000-8000-000000000023', 'b1110001-0000-4000-8000-000000000003', 'Angelina Camacho', 'Finished third in the September 14, 2021 preliminary.', 'angelina_camacho', 2, '{"sample_batch":"public-historical-v1","source":"Ballotpedia"}'::jsonb),

-- NYC Mayor 2021 general
('c1110002-0000-4000-8000-000000000001', 'b1110002-0000-4000-8000-000000000001', 'Eric Adams', 'Democratic nominee. Brooklyn Borough President; former NYPD captain. Won the 2021 general election.', 'eric_adams', 0, '{"party":"Democratic","running_mate":null,"sample_batch":"public-historical-v1"}'::jsonb),
('c1110002-0000-4000-8000-000000000002', 'b1110002-0000-4000-8000-000000000001', 'Curtis Sliwa', 'Republican nominee. Founder of the Guardian Angels; radio host.', 'curtis_sliwa', 1, '{"party":"Republican","sample_batch":"public-historical-v1"}'::jsonb),
-- Also note major Democratic primary competitors as open_nomination-style extras for testing richness
('c1110002-0000-4000-8000-000000000003', 'b1110002-0000-4000-8000-000000000001', 'Kathryn Garcia (Dem. primary)', 'Former NYC Sanitation Commissioner; finished second in the 2021 Democratic mayoral primary (RCV). Listed for primary-field testing context.', 'kathryn_garcia', 2, '{"party":"Democratic","contest_phase":"primary_context","sample_batch":"public-historical-v1"}'::jsonb),
('c1110002-0000-4000-8000-000000000004', 'b1110002-0000-4000-8000-000000000001', 'Maya Wiley (Dem. primary)', 'Civil rights attorney; finished third in the 2021 Democratic mayoral primary (RCV).', 'maya_wiley', 3, '{"party":"Democratic","contest_phase":"primary_context","sample_batch":"public-historical-v1"}'::jsonb),
('c1110002-0000-4000-8000-000000000005', 'b1110002-0000-4000-8000-000000000001', 'Andrew Yang (Dem. primary)', 'Entrepreneur; 2020 U.S. presidential candidate; 2021 Democratic mayoral primary candidate.', 'andrew_yang', 4, '{"party":"Democratic","contest_phase":"primary_context","sample_batch":"public-historical-v1"}'::jsonb),

-- London Mayor 2024
('c1110002-0000-4000-8000-000000000011', 'b1110002-0000-4000-8000-000000000002', 'Sadiq Khan', 'Labour Party. Incumbent Mayor of London; elected to a third term in 2024.', 'sadiq_khan', 0, '{"party":"Labour","sample_batch":"public-historical-v1"}'::jsonb),
('c1110002-0000-4000-8000-000000000012', 'b1110002-0000-4000-8000-000000000002', 'Susan Hall', 'Conservative Party. Former London Assembly Conservative group leader.', 'susan_hall', 1, '{"party":"Conservative","sample_batch":"public-historical-v1"}'::jsonb),
('c1110002-0000-4000-8000-000000000013', 'b1110002-0000-4000-8000-000000000002', 'Rob Blackie', 'Liberal Democrats mayoral nominee (2024).', 'rob_blackie', 2, '{"party":"Liberal Democrats","sample_batch":"public-historical-v1"}'::jsonb),
('c1110002-0000-4000-8000-000000000014', 'b1110002-0000-4000-8000-000000000002', 'Zoë Garbett', 'Green Party mayoral nominee; Hackney councillor.', 'zoe_garbett', 3, '{"party":"Green","sample_batch":"public-historical-v1"}'::jsonb),
('c1110002-0000-4000-8000-000000000015', 'b1110002-0000-4000-8000-000000000002', 'Howard Cox', 'Reform UK mayoral nominee (2024).', 'howard_cox', 4, '{"party":"Reform UK","sample_batch":"public-historical-v1"}'::jsonb),

-- Chicago Mayor 2023 runoff
('c1110002-0000-4000-8000-000000000021', 'b1110002-0000-4000-8000-000000000003', 'Brandon Johnson', 'Democratic progressive; Cook County commissioner; won the 2023 runoff.', 'brandon_johnson', 0, '{"party":"Democratic","sample_batch":"public-historical-v1"}'::jsonb),
('c1110002-0000-4000-8000-000000000022', 'b1110002-0000-4000-8000-000000000003', 'Paul Vallas', 'Former CPS CEO; finished first in the first round; lost the runoff.', 'paul_vallas', 1, '{"party":"Democratic","sample_batch":"public-historical-v1"}'::jsonb),

-- US Senate CA 2024
('c1110003-0000-4000-8000-000000000001', 'b1110003-0000-4000-8000-000000000001', 'Adam Schiff', 'Democratic nominee; U.S. Representative; elected U.S. Senator from California (2024).', 'adam_schiff', 0, '{"party":"Democratic","sample_batch":"public-historical-v1"}'::jsonb),
('c1110003-0000-4000-8000-000000000002', 'b1110003-0000-4000-8000-000000000001', 'Steve Garvey', 'Republican nominee; former MLB player.', 'steve_garvey', 1, '{"party":"Republican","sample_batch":"public-historical-v1"}'::jsonb),

-- US Senate PA 2024
('c1110003-0000-4000-8000-000000000011', 'b1110003-0000-4000-8000-000000000002', 'Dave McCormick', 'Republican nominee; elected U.S. Senator from Pennsylvania (2024).', 'dave_mccormick', 0, '{"party":"Republican","sample_batch":"public-historical-v1"}'::jsonb),
('c1110003-0000-4000-8000-000000000012', 'b1110003-0000-4000-8000-000000000002', 'Bob Casey Jr.', 'Democratic incumbent; defeated in 2024.', 'bob_casey_jr', 1, '{"party":"Democratic","sample_batch":"public-historical-v1"}'::jsonb),

-- US Senate OH 2024
('c1110003-0000-4000-8000-000000000021', 'b1110003-0000-4000-8000-000000000003', 'Bernie Moreno', 'Republican nominee; elected U.S. Senator from Ohio (2024).', 'bernie_moreno', 0, '{"party":"Republican","sample_batch":"public-historical-v1"}'::jsonb),
('c1110003-0000-4000-8000-000000000022', 'b1110003-0000-4000-8000-000000000003', 'Sherrod Brown', 'Democratic incumbent; defeated in 2024.', 'sherrod_brown', 1, '{"party":"Democratic","sample_batch":"public-historical-v1"}'::jsonb),

-- CA Governor 2022
('c1110004-0000-4000-8000-000000000001', 'b1110004-0000-4000-8000-000000000001', 'Gavin Newsom', 'Democratic incumbent Governor of California; re-elected 2022.', 'gavin_newsom', 0, '{"party":"Democratic","sample_batch":"public-historical-v1"}'::jsonb),
('c1110004-0000-4000-8000-000000000002', 'b1110004-0000-4000-8000-000000000001', 'Brian Dahle', 'Republican nominee; California State Senator.', 'brian_dahle', 1, '{"party":"Republican","sample_batch":"public-historical-v1"}'::jsonb),

-- NY Governor 2022
('c1110004-0000-4000-8000-000000000011', 'b1110004-0000-4000-8000-000000000002', 'Kathy Hochul', 'Democratic incumbent Governor of New York; elected 2022.', 'kathy_hochul', 0, '{"party":"Democratic","sample_batch":"public-historical-v1"}'::jsonb),
('c1110004-0000-4000-8000-000000000012', 'b1110004-0000-4000-8000-000000000002', 'Lee Zeldin', 'Republican nominee; former U.S. Representative.', 'lee_zeldin', 1, '{"party":"Republican","sample_batch":"public-historical-v1"}'::jsonb),

-- TX Governor 2022
('c1110004-0000-4000-8000-000000000021', 'b1110004-0000-4000-8000-000000000003', 'Greg Abbott', 'Republican incumbent Governor of Texas; re-elected 2022.', 'greg_abbott', 0, '{"party":"Republican","sample_batch":"public-historical-v1"}'::jsonb),
('c1110004-0000-4000-8000-000000000022', 'b1110004-0000-4000-8000-000000000003', 'Beto O''Rourke', 'Democratic nominee; former U.S. Representative.', 'beto_orourke', 1, '{"party":"Democratic","sample_batch":"public-historical-v1"}'::jsonb),

-- US President 2024
('c1110005-0000-4000-8000-000000000001', 'b1110005-0000-4000-8000-000000000001', 'Donald Trump / JD Vance', 'Republican ticket. Trump (FL) / Vance (OH). Electoral vote 312; popular vote ~49.8%.', 'trump_vance', 0, '{"party":"Republican","president":"Donald Trump","vice_president":"JD Vance","electoral_votes":312,"popular_vote_pct":49.8,"sample_batch":"public-historical-v1"}'::jsonb),
('c1110005-0000-4000-8000-000000000002', 'b1110005-0000-4000-8000-000000000001', 'Kamala Harris / Tim Walz', 'Democratic ticket. Harris (CA) / Walz (MN). Electoral vote 226; popular vote ~48.3%.', 'harris_walz', 1, '{"party":"Democratic","president":"Kamala Harris","vice_president":"Tim Walz","electoral_votes":226,"popular_vote_pct":48.3,"sample_batch":"public-historical-v1"}'::jsonb),
('c1110005-0000-4000-8000-000000000003', 'b1110005-0000-4000-8000-000000000001', 'Jill Stein / Butch Ware', 'Green Party ticket. Popular vote ~0.56%.', 'stein_ware', 2, '{"party":"Green","president":"Jill Stein","vice_president":"Butch Ware","popular_vote_pct":0.56,"sample_batch":"public-historical-v1"}'::jsonb),
('c1110005-0000-4000-8000-000000000004', 'b1110005-0000-4000-8000-000000000001', 'Robert F. Kennedy Jr. / Nicole Shanahan', 'Independent ticket (remained on many state ballots). Popular vote ~0.49%.', 'rfk_shanahan', 3, '{"party":"Independent","president":"Robert F. Kennedy Jr.","vice_president":"Nicole Shanahan","popular_vote_pct":0.49,"sample_batch":"public-historical-v1"}'::jsonb),
('c1110005-0000-4000-8000-000000000005', 'b1110005-0000-4000-8000-000000000001', 'Chase Oliver / Mike ter Maat', 'Libertarian Party ticket. Popular vote ~0.42%.', 'oliver_ter_maat', 4, '{"party":"Libertarian","president":"Chase Oliver","vice_president":"Mike ter Maat","popular_vote_pct":0.42,"sample_batch":"public-historical-v1"}'::jsonb),

-- France President 2022 first round majors
('c1110005-0000-4000-8000-000000000011', 'b1110005-0000-4000-8000-000000000002', 'Emmanuel Macron', 'La République En Marche! / Ensemble. Incumbent; advanced to runoff and re-elected.', 'emmanuel_macron', 0, '{"party":"Ensemble","sample_batch":"public-historical-v1"}'::jsonb),
('c1110005-0000-4000-8000-000000000012', 'b1110005-0000-4000-8000-000000000002', 'Marine Le Pen', 'Rassemblement National. Advanced to runoff.', 'marine_le_pen', 1, '{"party":"Rassemblement National","sample_batch":"public-historical-v1"}'::jsonb),
('c1110005-0000-4000-8000-000000000013', 'b1110005-0000-4000-8000-000000000002', 'Jean-Luc Mélenchon', 'La France Insoumise. Third in first round.', 'jean_luc_melenchon', 2, '{"party":"La France Insoumise","sample_batch":"public-historical-v1"}'::jsonb),
('c1110005-0000-4000-8000-000000000014', 'b1110005-0000-4000-8000-000000000002', 'Éric Zemmour', 'Reconquête. First-round candidate.', 'eric_zemmour', 3, '{"party":"Reconquête","sample_batch":"public-historical-v1"}'::jsonb),
('c1110005-0000-4000-8000-000000000015', 'b1110005-0000-4000-8000-000000000002', 'Valérie Pécresse', 'Les Républicains. First-round candidate.', 'valerie_pecresse', 4, '{"party":"Les Républicains","sample_batch":"public-historical-v1"}'::jsonb),
('c1110005-0000-4000-8000-000000000016', 'b1110005-0000-4000-8000-000000000002', 'Yannick Jadot', 'Europe Écologie Les Verts. First-round candidate.', 'yannick_jadot', 5, '{"party":"EELV","sample_batch":"public-historical-v1"}'::jsonb),

-- Brazil President 2022
('c1110005-0000-4000-8000-000000000021', 'b1110005-0000-4000-8000-000000000003', 'Luiz Inácio Lula da Silva', 'Workers'' Party (PT). Elected president in the 2022 runoff.', 'lula', 0, '{"party":"PT","sample_batch":"public-historical-v1"}'::jsonb),
('c1110005-0000-4000-8000-000000000022', 'b1110005-0000-4000-8000-000000000003', 'Jair Bolsonaro', 'Liberal Party (PL). Incumbent; defeated in runoff.', 'jair_bolsonaro', 1, '{"party":"PL","sample_batch":"public-historical-v1"}'::jsonb),
('c1110005-0000-4000-8000-000000000023', 'b1110005-0000-4000-8000-000000000003', 'Simone Tebet', 'MDB. Third in the first round.', 'simone_tebet', 2, '{"party":"MDB","sample_batch":"public-historical-v1"}'::jsonb),
('c1110005-0000-4000-8000-000000000024', 'b1110005-0000-4000-8000-000000000003', 'Ciro Gomes', 'Democratic Labour Party (PDT). First-round candidate.', 'ciro_gomes', 3, '{"party":"PDT","sample_batch":"public-historical-v1"}'::jsonb),

-- EP France 2024 list heads
('c1110006-0000-4000-8000-000000000001', 'b1110006-0000-4000-8000-000000000001', 'Jordan Bardella — Rassemblement national', 'Tête de liste, Rassemblement national (2024).', 'bardella_rn', 0, '{"party":"Rassemblement national","role":"list_head","sample_batch":"public-historical-v1"}'::jsonb),
('c1110006-0000-4000-8000-000000000002', 'b1110006-0000-4000-8000-000000000001', 'Valérie Hayer — Besoin d''Europe (Renaissance alliance)', 'Tête de liste, presidential majority alliance.', 'hayer_renaissance', 1, '{"party":"Renaissance alliance","role":"list_head","sample_batch":"public-historical-v1"}'::jsonb),
('c1110006-0000-4000-8000-000000000003', 'b1110006-0000-4000-8000-000000000001', 'Raphaël Glucksmann — PS / Place publique', 'Tête de liste, Parti socialiste / Place publique.', 'glucksmann_ps', 2, '{"party":"PS / Place publique","role":"list_head","sample_batch":"public-historical-v1"}'::jsonb),
('c1110006-0000-4000-8000-000000000004', 'b1110006-0000-4000-8000-000000000001', 'Manon Aubry — La France insoumise', 'Tête de liste, La France insoumise.', 'aubry_lfi', 3, '{"party":"La France insoumise","role":"list_head","sample_batch":"public-historical-v1"}'::jsonb),
('c1110006-0000-4000-8000-000000000005', 'b1110006-0000-4000-8000-000000000001', 'François-Xavier Bellamy — Les Républicains', 'Tête de liste, Les Républicains.', 'bellamy_lr', 4, '{"party":"Les Républicains","role":"list_head","sample_batch":"public-historical-v1"}'::jsonb),
('c1110006-0000-4000-8000-000000000006', 'b1110006-0000-4000-8000-000000000001', 'Marie Toussaint — Les Écologistes', 'Tête de liste, Les Écologistes (EELV).', 'toussaint_eelv', 5, '{"party":"Les Écologistes","role":"list_head","sample_batch":"public-historical-v1"}'::jsonb),
('c1110006-0000-4000-8000-000000000007', 'b1110006-0000-4000-8000-000000000001', 'Marion Maréchal — Reconquête!', 'Tête de liste, Reconquête!', 'marechal_reconquete', 6, '{"party":"Reconquête!","role":"list_head","sample_batch":"public-historical-v1"}'::jsonb),

-- EP Germany 2024 party leads (publicly reported Spitzenkandidaten / list leads)
('c1110006-0000-4000-8000-000000000011', 'b1110006-0000-4000-8000-000000000002', 'Ursula von der Leyen — CDU/CSU (EPP lead)', 'EPP Spitzenkandidatin; CDU/CSU campaign lead context for 2024.', 'von_der_leyen_cdu', 0, '{"party":"CDU/CSU","role":"list_lead","sample_batch":"public-historical-v1"}'::jsonb),
('c1110006-0000-4000-8000-000000000012', 'b1110006-0000-4000-8000-000000000002', 'Katarina Barley — SPD', 'SPD lead candidate for the 2024 European election in Germany.', 'barley_spd', 1, '{"party":"SPD","role":"list_lead","sample_batch":"public-historical-v1"}'::jsonb),
('c1110006-0000-4000-8000-000000000013', 'b1110006-0000-4000-8000-000000000002', 'Terry Reintke — Greens', 'Alliance 90/The Greens lead candidate (with others in Green campaign).', 'reintke_greens', 2, '{"party":"Alliance 90/The Greens","role":"list_lead","sample_batch":"public-historical-v1"}'::jsonb),
('c1110006-0000-4000-8000-000000000014', 'b1110006-0000-4000-8000-000000000002', 'Marie-Agnes Strack-Zimmermann — FDP', 'FDP lead candidate for 2024.', 'strack_zimmermann_fdp', 3, '{"party":"FDP","role":"list_lead","sample_batch":"public-historical-v1"}'::jsonb),
('c1110006-0000-4000-8000-000000000015', 'b1110006-0000-4000-8000-000000000002', 'Maximilian Krah — AfD', 'AfD lead candidate context for 2024 (later campaign controversies widely reported).', 'krah_afd', 4, '{"party":"AfD","role":"list_lead","sample_batch":"public-historical-v1"}'::jsonb),

-- EP Italy 2024 list leaders
('c1110006-0000-4000-8000-000000000021', 'b1110006-0000-4000-8000-000000000003', 'Giorgia Meloni — Fratelli d''Italia', 'FdI party leader; coalition list leadership context for 2024 EP election.', 'meloni_fdi', 0, '{"party":"Fratelli d''Italia","role":"list_leader","sample_batch":"public-historical-v1"}'::jsonb),
('c1110006-0000-4000-8000-000000000022', 'b1110006-0000-4000-8000-000000000003', 'Elly Schlein — Partito Democratico', 'PD party leader; 2024 EP list leadership context.', 'schlein_pd', 1, '{"party":"Partito Democratico","role":"list_leader","sample_batch":"public-historical-v1"}'::jsonb),
('c1110006-0000-4000-8000-000000000023', 'b1110006-0000-4000-8000-000000000003', 'Giuseppe Conte — Movimento 5 Stelle', 'M5S leader; 2024 EP list leadership context.', 'conte_m5s', 2, '{"party":"Movimento 5 Stelle","role":"list_leader","sample_batch":"public-historical-v1"}'::jsonb),
('c1110006-0000-4000-8000-000000000024', 'b1110006-0000-4000-8000-000000000003', 'Antonio Tajani — Forza Italia', 'Forza Italia leader; 2024 EP list leadership context.', 'tajani_fi', 3, '{"party":"Forza Italia","role":"list_leader","sample_batch":"public-historical-v1"}'::jsonb),
('c1110006-0000-4000-8000-000000000025', 'b1110006-0000-4000-8000-000000000003', 'Matteo Salvini — Lega', 'Lega leader; 2024 EP list leadership context.', 'salvini_lega', 4, '{"party":"Lega","role":"list_leader","sample_batch":"public-historical-v1"}'::jsonb);

-- Verification summary
SELECT tier::text, count(*) AS elections
FROM public.civic_elections
WHERE metadata->>'sample_batch' = 'public-historical-v1'
GROUP BY 1
ORDER BY 1;

SELECT count(*) AS contests FROM public.civic_contests c
JOIN public.civic_elections e ON e.id = c.election_id
WHERE e.metadata->>'sample_batch' = 'public-historical-v1';

SELECT count(*) AS candidates FROM public.civic_candidates cand
JOIN public.civic_contests c ON c.id = cand.contest_id
JOIN public.civic_elections e ON e.id = c.election_id
WHERE e.metadata->>'sample_batch' = 'public-historical-v1';
