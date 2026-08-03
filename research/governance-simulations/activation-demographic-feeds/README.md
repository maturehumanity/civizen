# Activation demographic feed tooling (research)

**Non-operational.** Exploratory demographic-feed adapters, workers, signing, scheduler health, and escalation-policy helpers formerly under `src/lib/`.

The Civizen production application must **not** import these modules. They are kept for research / ops redesign only.

Production governance admin uses Program Readiness (`GovernanceProgramReadinessCard`) without demographic ingest UI. Historical database tables and RPCs may still exist for compatibility; this package is not on the app route graph and is outside the Vite production entry.
