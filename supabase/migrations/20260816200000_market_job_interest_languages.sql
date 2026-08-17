-- Preferred workplace languages on Market Jobs submissions (ISO 639 / BCP 47 base codes).

ALTER TABLE public.market_job_interests
  ADD COLUMN IF NOT EXISTS languages text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.market_job_interests.languages IS
  'Preferred workplace languages as ISO 639 / BCP 47 base codes.';
