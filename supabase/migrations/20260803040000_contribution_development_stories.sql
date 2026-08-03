-- Backfill platform improvement stories into Contributions ledger.
-- Also remove chat-mirror content_item events that inflated activity without representing product work.

DELETE FROM public.profile_contribution_events
WHERE source_table = 'content_items'
  AND coalesce(raw_meta->>'source_table', '') IN ('private_messages', 'messages');

INSERT INTO public.profile_contribution_events (
  profile_id, source_table, source_id, event_type, title, summary,
  capacity_estimate, impact_estimate, collaboration_estimate, beneficiary_estimate,
  verified, occurred_at, raw_meta
)
SELECT
  ds.author_id,
  'development_stories',
  ds.id::text,
  'development_story',
  left(coalesce(nullif(trim(ds.title), ''), 'Platform improvement'), 120),
  left(trim(both ' · ' from concat_ws(' · ', nullif(trim(ds.section), ''), nullif(trim(ds.area), ''))), 80),
  CASE
    WHEN coalesce(cardinality(ds.created_features), 0) > 0 THEN 78
    ELSE 68
  END,
  CASE
    WHEN coalesce(cardinality(ds.created_features), 0) > 0 THEN least(100, 78 * 1.25)
    ELSE 62
  END,
  35,
  75,
  coalesce(cardinality(ds.created_features), 0) > 0,
  coalesce(ds.requested_at, ds.created_at),
  jsonb_build_object(
    'section', ds.section,
    'area', ds.area,
    'feature_count', coalesce(cardinality(ds.created_features), 0)
  )
FROM public.development_stories ds
ON CONFLICT (source_table, source_id) DO UPDATE SET
  title = EXCLUDED.title,
  summary = EXCLUDED.summary,
  capacity_estimate = EXCLUDED.capacity_estimate,
  impact_estimate = EXCLUDED.impact_estimate,
  collaboration_estimate = EXCLUDED.collaboration_estimate,
  beneficiary_estimate = EXCLUDED.beneficiary_estimate,
  verified = EXCLUDED.verified,
  occurred_at = EXCLUDED.occurred_at,
  raw_meta = EXCLUDED.raw_meta,
  updated_at = now();
