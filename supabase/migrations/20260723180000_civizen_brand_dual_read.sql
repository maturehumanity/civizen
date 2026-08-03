-- Civizen rebrand: additive dual-read aliases for score / LSP columns.
-- Historical Levela column names remain the physical storage.

DO $$
BEGIN
  -- profiles.levela_score → also expose civizen_score as generated alias if column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'levela_score'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'civizen_score'
  ) THEN
    ALTER TABLE public.profiles
      ADD COLUMN civizen_score numeric
      GENERATED ALWAYS AS (levela_score) STORED;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'civizen_score alias skipped: %', SQLERRM;
END $$;

-- Comment for operators
COMMENT ON SCHEMA public IS 'Civizen product DB (legacy Levela column names retained where dual-read applies)';
