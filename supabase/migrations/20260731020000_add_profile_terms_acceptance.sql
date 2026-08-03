-- Terms of Use versioning + affirmative acceptance (P0-03).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS terms_version text,
  ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS terms_acceptance_method text;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_terms_acceptance_method_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_terms_acceptance_method_check
  CHECK (
    terms_acceptance_method IS NULL
    OR terms_acceptance_method IN ('signup', 'reconsent')
  );

COMMENT ON COLUMN public.profiles.terms_version IS
  'Identified Terms of Use version the user affirmatively accepted.';
COMMENT ON COLUMN public.profiles.terms_accepted_at IS
  'Timestamp of the latest affirmative Terms acceptance.';
COMMENT ON COLUMN public.profiles.terms_acceptance_method IS
  'How the latest Terms acceptance was recorded: signup or reconsent.';

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (
    user_id,
    username,
    full_name,
    avatar_url,
    country,
    country_code,
    language_code,
    phone_country_code,
    phone_number,
    phone_e164,
    date_of_birth,
    terms_version,
    terms_accepted_at,
    terms_acceptance_method
  )
  VALUES (
    NEW.id,
    NULLIF(NEW.raw_user_meta_data->>'username', ''),
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url',
    NULLIF(NEW.raw_user_meta_data->>'country', ''),
    NULLIF(upper(NEW.raw_user_meta_data->>'country_code'), ''),
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'language_code', ''), 'en'),
    NULLIF(NEW.raw_user_meta_data->>'phone_country_code', ''),
    NULLIF(NEW.raw_user_meta_data->>'phone_number', ''),
    NULLIF(NEW.raw_user_meta_data->>'phone_e164', ''),
    NULLIF(NEW.raw_user_meta_data->>'date_of_birth', '')::date,
    NULLIF(NEW.raw_user_meta_data->>'terms_version', ''),
    CASE
      WHEN NULLIF(NEW.raw_user_meta_data->>'terms_accepted_at', '') IS NULL THEN NULL
      ELSE (NEW.raw_user_meta_data->>'terms_accepted_at')::timestamptz
    END,
    COALESCE(
      NULLIF(NEW.raw_user_meta_data->>'terms_acceptance_method', ''),
      CASE
        WHEN NULLIF(NEW.raw_user_meta_data->>'terms_version', '') IS NOT NULL THEN 'signup'
        ELSE NULL
      END
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
