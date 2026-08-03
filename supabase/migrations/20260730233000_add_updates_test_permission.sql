DO $$
BEGIN
  ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'updates.test';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Testers/developers: founder, admin, and system can opt into the Android Test update channel.
INSERT INTO public.role_permissions (role, permission)
VALUES
  ('founder', 'updates.test'),
  ('admin', 'updates.test'),
  ('system', 'updates.test')
ON CONFLICT (role, permission) DO NOTHING;
