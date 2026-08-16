-- Adaptive Happiness check-in: multiple areas, support vs problem polarity.
-- Additive only. Do not rewrite historic check-in or cause rows.
-- Individual check-ins and causes remain owner-only; this does not expand grants.

ALTER TABLE public.happiness_checkins
  ADD COLUMN IF NOT EXISTS areas jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.happiness_checkins.areas IS
  'Selected life areas for this check-in: [{category, polarity}] where polarity is problem, support, or both. affecting_most remains the primary problem area for older rows and compact display.';

ALTER TABLE public.happiness_causes
  ADD COLUMN IF NOT EXISTS polarity text NOT NULL DEFAULT 'problem';

ALTER TABLE public.happiness_causes
  DROP CONSTRAINT IF EXISTS happiness_causes_polarity_check;

ALTER TABLE public.happiness_causes
  ADD CONSTRAINT happiness_causes_polarity_check
  CHECK (polarity IN ('problem', 'support'));

COMMENT ON COLUMN public.happiness_causes.polarity IS
  'Whether this cause is a problem reducing wellbeing or a support. Default problem preserves Improve and historic check-in rows.';
