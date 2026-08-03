-- Education entry verification / certificate proof (owner-uploaded until institution verifies).

ALTER TABLE public.profile_education_entries
  ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS certificate_path text,
  ADD COLUMN IF NOT EXISTS certificate_uploaded_at timestamptz;

COMMENT ON COLUMN public.profile_education_entries.verification_status IS
  'unverified | certificate_provided | verified';

INSERT INTO storage.buckets (id, name, public)
VALUES ('education-certificates', 'education-certificates', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Education certificates read own" ON storage.objects;
DROP POLICY IF EXISTS "Education certificates insert own" ON storage.objects;
DROP POLICY IF EXISTS "Education certificates update own" ON storage.objects;
DROP POLICY IF EXISTS "Education certificates delete own" ON storage.objects;

CREATE POLICY "Education certificates read own"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'education-certificates'
  AND COALESCE((storage.foldername(name))[1], '') = auth.uid()::text
);

CREATE POLICY "Education certificates insert own"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'education-certificates'
  AND COALESCE((storage.foldername(name))[1], '') = auth.uid()::text
);

CREATE POLICY "Education certificates update own"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'education-certificates'
  AND COALESCE((storage.foldername(name))[1], '') = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'education-certificates'
  AND COALESCE((storage.foldername(name))[1], '') = auth.uid()::text
);

CREATE POLICY "Education certificates delete own"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'education-certificates'
  AND COALESCE((storage.foldername(name))[1], '') = auth.uid()::text
);
