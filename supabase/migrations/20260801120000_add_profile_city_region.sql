-- Profile residence fields for civic voting location filters.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS region_code text;

COMMENT ON COLUMN public.profiles.city IS 'Current city of residence (may be device-detected).';
COMMENT ON COLUMN public.profiles.region_code IS 'Current region/state code (preferably ISO 3166-2 subdivision, often 2 letters).';
