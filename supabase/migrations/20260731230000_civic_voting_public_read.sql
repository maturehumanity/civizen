-- Public read access for civic election catalog (transparency).
-- Ballots, sessions, home, devices, and selections stay non-public.

GRANT SELECT ON public.civic_elections TO anon;
GRANT SELECT ON public.civic_contests TO anon;
GRANT SELECT ON public.civic_candidates TO anon;
GRANT SELECT ON public.civic_voting_events TO anon;

DROP POLICY IF EXISTS "Civic elections readable by authenticated" ON public.civic_elections;
DROP POLICY IF EXISTS "Civic elections readable by public" ON public.civic_elections;
CREATE POLICY "Civic elections readable by public"
  ON public.civic_elections FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Civic contests readable by authenticated" ON public.civic_contests;
DROP POLICY IF EXISTS "Civic contests readable by public" ON public.civic_contests;
CREATE POLICY "Civic contests readable by public"
  ON public.civic_contests FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Civic candidates readable by authenticated" ON public.civic_candidates;
DROP POLICY IF EXISTS "Civic candidates readable by public" ON public.civic_candidates;
CREATE POLICY "Civic candidates readable by public"
  ON public.civic_candidates FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Civic voting events readable by authenticated" ON public.civic_voting_events;
DROP POLICY IF EXISTS "Civic voting events readable by public" ON public.civic_voting_events;
CREATE POLICY "Civic voting events readable by public"
  ON public.civic_voting_events FOR SELECT TO anon, authenticated
  USING (true);
