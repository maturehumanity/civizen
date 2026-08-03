-- Broad field / department for the Education sentence (distinct from specialization/major).

ALTER TABLE public.profile_education_entries
  ADD COLUMN IF NOT EXISTS department text;

COMMENT ON COLUMN public.profile_education_entries.department IS
  'Broad field or department of study (e.g. Economics). specialization/major lives in major.';
