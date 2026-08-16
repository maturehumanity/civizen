-- Non-destructive: action workflow status on existing work_interventions.
ALTER TABLE public.work_interventions
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'planned';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'work_interventions_status_check'
  ) THEN
    ALTER TABLE public.work_interventions
      ADD CONSTRAINT work_interventions_status_check
      CHECK (status IN ('planned', 'in_progress', 'completed', 'dismissed'));
  END IF;
END
$$;

COMMENT ON COLUMN public.work_interventions.status IS
  'Member-facing improvement workflow: planned → in_progress → completed. Dismissed is explicit.';
