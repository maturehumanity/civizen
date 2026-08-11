# Local-dev-only finance seeds

These scripts must **not** be applied to the remote/production application database.

| Script | Purpose |
| --- | --- |
| `seed-initial-working-budget-v01.sql` | Recreates obsolete `Civizen Draft Budget v0.1` demonstration skeleton (zeros) for isolated local experiments only |

Ordinary remote seeding uses `scripts/db/seed-validation-budget-v01.sql` for the validation subprogram budget.

To apply locally (explicit only):

```bash
# Against a local Postgres / compose DB — never as an ordinary remote migration
psql ... -f scripts/db/local-dev-only/seed-initial-working-budget-v01.sql
```

Structure fixture for tests remains in `src/lib/finance/initial-budget-v01.ts`.
