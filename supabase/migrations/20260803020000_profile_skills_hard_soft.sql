-- Split profile skills into hard and soft lists (sentence UI + scoring).

ALTER TABLE public.profile_skills_entries
  ADD COLUMN IF NOT EXISTS hard_skill_names text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS soft_skill_names text[] NOT NULL DEFAULT '{}'::text[];

COMMENT ON COLUMN public.profile_skills_entries.hard_skill_names IS
  'Declared hard / technical skills from the Profile Skills sentence.';
COMMENT ON COLUMN public.profile_skills_entries.soft_skill_names IS
  'Declared soft / interpersonal skills from the Profile Skills sentence.';

-- Soft-migrate legacy flat skill_names: known soft seeds → soft, everything else → hard.
DO $$
DECLARE
  soft_seeds text[] := ARRAY[
    'accountability',
    'advocacy',
    'civic engagement',
    'community organizing',
    'conflict resolution',
    'critical thinking',
    'facilitation',
    'leadership',
    'mentoring',
    'negotiation',
    'public speaking',
    'stakeholder engagement',
    'strategic planning',
    'systems thinking',
    'teaching',
    'volunteer coordination'
  ];
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profile_skills_entries'
      AND column_name = 'skill_names'
  ) THEN
    UPDATE public.profile_skills_entries
    SET
      soft_skill_names = COALESCE((
        SELECT array_agg(skill ORDER BY ordinality)
        FROM unnest(COALESCE(skill_names, '{}'::text[])) WITH ORDINALITY AS t(skill, ordinality)
        WHERE lower(trim(skill)) = ANY (soft_seeds)
      ), '{}'::text[]),
      hard_skill_names = COALESCE((
        SELECT array_agg(skill ORDER BY ordinality)
        FROM unnest(COALESCE(skill_names, '{}'::text[])) WITH ORDINALITY AS t(skill, ordinality)
        WHERE lower(trim(skill)) <> ALL (soft_seeds)
      ), '{}'::text[])
    WHERE cardinality(COALESCE(skill_names, '{}'::text[])) > 0
      AND cardinality(hard_skill_names) = 0
      AND cardinality(soft_skill_names) = 0;
  END IF;
END $$;
