-- OBSOLETE PATH — do not apply on remote/production.
-- Civizen Draft Budget v0.1 was retired from ordinary application use.
-- Explicit local-only recreation:
--   scripts/db/local-dev-only/seed-initial-working-budget-v01.sql
-- Structure fixture for tests:
--   src/lib/finance/initial-budget-v01.ts
-- Retirement record:
--   scripts/db/retire-demo-draft-budget-v01.sql

DO $$
BEGIN
  RAISE EXCEPTION
    'Refusing to seed Civizen Draft Budget v0.1 from scripts/db/. Use scripts/db/local-dev-only/seed-initial-working-budget-v01.sql for explicit local-only recreation.';
END $$;
