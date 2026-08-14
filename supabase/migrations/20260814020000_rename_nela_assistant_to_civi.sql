-- Rename the built-in messaging assistant profile to Civi (display + username).
-- Profile id stays a0000000-0000-4000-8000-000000000001.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE username = 'civi'
      AND id <> 'a0000000-0000-4000-8000-000000000001'::uuid
  ) THEN
    RAISE EXCEPTION 'username civi is already taken by another profile';
  END IF;

  UPDATE public.profiles
  SET
    username = 'civi',
    full_name = 'Civi',
    updated_at = now()
  WHERE id = 'a0000000-0000-4000-8000-000000000001'::uuid;
END $$;
