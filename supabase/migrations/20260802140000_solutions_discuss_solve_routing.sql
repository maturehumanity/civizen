-- Solutions Discuss/Solve routing + civic authority catalog

CREATE TABLE IF NOT EXISTS public.solution_authorities (
  id text PRIMARY KEY,
  name text NOT NULL,
  tier text NOT NULL CHECK (tier IN ('executive', 'national', 'regional', 'local', 'independent', 'civizen')),
  responsibilities text NOT NULL,
  keywords text[] NOT NULL DEFAULT '{}'::text[],
  related_profession_ids text[] NOT NULL DEFAULT '{}'::text[],
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.solution_authorities IS 'Jurisdiction-agnostic civic authority taxonomy for Solutions routing (not a claim of governmental power by Civizen).';

INSERT INTO public.solution_authorities (id, name, tier, responsibilities, keywords, related_profession_ids, sort_order)
VALUES
  ('executive_office', 'Executive / Head of Government Office', 'executive', 'Whole-of-government coordination, cabinet priorities, cross-ministry crises, and matters that do not fit a single department.', ARRAY['president', 'prime minister', 'cabinet', 'executive', 'government-wide', 'cross-ministry']::text[], ARRAY['governance']::text[], 10),
  ('interior', 'Interior / Home Affairs', 'national', 'Domestic administration, civil registry, internal security policy, policing oversight (where applicable), and public order frameworks.', ARRAY['interior', 'home affairs', 'civil registry', 'id card', 'passport office', 'police oversight', 'public order']::text[], ARRAY['governance', 'law']::text[], 20),
  ('foreign_affairs', 'Foreign Affairs / Diplomacy', 'national', 'International relations, embassies, treaties, consular assistance abroad, and diplomatic coordination.', ARRAY['foreign', 'diplomacy', 'embassy', 'consular', 'treaty', 'visa abroad', 'international relations']::text[], ARRAY['governance', 'law']::text[], 30),
  ('defense', 'Defense / National Security', 'national', 'Armed forces, national defense policy, and high-level security coordination (not routine local policing).', ARRAY['defense', 'defence', 'military', 'armed forces', 'national security', 'veterans combat']::text[], ARRAY['governance']::text[], 40),
  ('justice', 'Justice / Attorney General', 'national', 'Criminal and civil justice policy, prosecutions (where executive), legal reform, and access-to-justice programs.', ARRAY['justice', 'attorney general', 'prosecutor', 'criminal', 'lawsuit', 'legal reform', 'courts policy']::text[], ARRAY['law']::text[], 50),
  ('judiciary', 'Judiciary / Courts', 'independent', 'Independent courts, case administration, judicial procedure, and court access (separate from political ministries).', ARRAY['court', 'judge', 'judiciary', 'hearing', 'trial', 'bailiff', 'court clerk']::text[], ARRAY['law']::text[], 55),
  ('finance', 'Finance / Treasury', 'national', 'Public budget, debt, fiscal policy, and financial management of the state.', ARRAY['treasury', 'budget', 'fiscal', 'public debt', 'finance ministry', 'appropriations']::text[], ARRAY['finance', 'governance']::text[], 60),
  ('taxation', 'Taxation / Revenue Authority', 'national', 'Tax collection, tax compliance, customs duties (where combined), and taxpayer services.', ARRAY['tax', 'taxation', 'irs', 'revenue', 'vat', 'customs duty', 'taxpayer']::text[], ARRAY['finance', 'law']::text[], 65),
  ('economy', 'Economy / Commerce / Trade', 'national', 'Business regulation, trade policy, competition, small business support, and commercial standards.', ARRAY['commerce', 'trade', 'business license', 'competition', 'market regulation', 'export', 'import']::text[], ARRAY['finance', 'governance']::text[], 70),
  ('labor', 'Labor / Employment', 'national', 'Workplace standards, unemployment support, labor disputes frameworks, and workforce programs.', ARRAY['labor', 'labour', 'employment', 'wage', 'workplace', 'unemployment', 'union', 'worker rights']::text[], ARRAY['law', 'governance']::text[], 80),
  ('health', 'Health / Public Health', 'national', 'Hospitals policy, public health, epidemics, medical licensing frameworks, and health coverage programs.', ARRAY['health', 'hospital', 'clinic', 'doctor', 'epidemic', 'vaccine', 'public health', 'mental health']::text[], ARRAY['medicine']::text[], 90),
  ('education', 'Education', 'national', 'Primary and secondary schools, curricula standards, teachers, and student services policy.', ARRAY['school', 'education', 'teacher', 'curriculum', 'student', 'kindergarten', 'high school']::text[], ARRAY['education']::text[], 100),
  ('higher_education', 'Higher Education / Science / Research', 'national', 'Universities, research funding, scientific policy, and advanced skills programs.', ARRAY['university', 'college', 'research', 'science ministry', 'scholarship', 'phd']::text[], ARRAY['education']::text[], 105),
  ('transport', 'Transportation / Roads / Transit', 'national', 'Roads, rail, aviation policy, public transit, traffic safety, and transport licensing.', ARRAY['road', 'highway', 'transit', 'bus', 'train', 'airport', 'traffic', 'dmv', 'driving license']::text[], ARRAY['governance']::text[], 110),
  ('infrastructure', 'Infrastructure / Public Works', 'national', 'Major public works, bridges, ports, and capital infrastructure programs.', ARRAY['infrastructure', 'bridge', 'public works', 'construction project', 'port', 'capital project']::text[], ARRAY['governance']::text[], 115),
  ('housing', 'Housing / Urban Development', 'national', 'Housing policy, affordable housing, urban renewal, and building standards at national level.', ARRAY['housing', 'apartment', 'rent', 'homeless', 'urban development', 'building code national']::text[], ARRAY['governance', 'law']::text[], 120),
  ('environment', 'Environment / Climate', 'national', 'Environmental protection, pollution control, climate policy, and conservation.', ARRAY['environment', 'pollution', 'climate', 'emissions', 'conservation', 'wildlife', 'recycling']::text[], ARRAY['governance']::text[], 130),
  ('energy', 'Energy', 'national', 'Electricity, fuel, energy markets, grid reliability, and renewable energy policy.', ARRAY['energy', 'electricity', 'power outage', 'grid', 'fuel', 'renewable', 'oil gas']::text[], ARRAY['governance']::text[], 135),
  ('agriculture', 'Agriculture / Food', 'national', 'Farming policy, food safety standards, rural development, and agricultural markets.', ARRAY['agriculture', 'farm', 'food safety', 'crop', 'livestock', 'rural']::text[], ARRAY['governance']::text[], 140),
  ('water', 'Water Resources', 'national', 'Drinking water policy, irrigation, watersheds, and water quality standards.', ARRAY['water', 'drought', 'irrigation', 'reservoir', 'drinking water', 'watershed']::text[], ARRAY['governance']::text[], 145),
  ('social_welfare', 'Social Welfare / Social Services', 'national', 'Social assistance, disability support, family benefits, and social protection programs.', ARRAY['welfare', 'social services', 'benefits', 'disability', 'poverty', 'food stamps', 'social assistance']::text[], ARRAY['governance', 'medicine']::text[], 150),
  ('culture', 'Culture / Heritage', 'national', 'Cultural institutions, heritage protection, museums, and arts policy.', ARRAY['culture', 'heritage', 'museum', 'arts', 'monument', 'language policy']::text[], ARRAY['education', 'governance']::text[], 160),
  ('communications', 'Communications / Digital / Media', 'national', 'Telecom regulation, internet policy, broadcasting, and digital public services.', ARRAY['telecom', 'internet', 'broadband', 'broadcast', 'media regulator', 'digital government']::text[], ARRAY['governance']::text[], 170),
  ('immigration', 'Immigration / Citizenship Affairs', 'national', 'Immigration status, residence permits, naturalization procedures, and border entry policy.', ARRAY['immigration', 'visa', 'asylum', 'citizenship application', 'residence permit', 'border']::text[], ARRAY['law', 'governance']::text[], 180),
  ('emergency', 'Emergency Management / Civil Protection', 'national', 'Disaster response, civil protection, emergency preparedness, and crisis coordination.', ARRAY['emergency', 'disaster', 'earthquake', 'flood response', 'civil protection', 'evacuation']::text[], ARRAY['governance', 'medicine']::text[], 190),
  ('consumer', 'Consumer Protection', 'national', 'Consumer rights, product safety, unfair commercial practices, and complaint handling.', ARRAY['consumer', 'scam', 'fraud purchase', 'product safety', 'refund', 'warranty']::text[], ARRAY['law', 'finance']::text[], 200),
  ('planning', 'Planning / Land Use', 'regional', 'Zoning, land-use permits, regional planning, and development approvals.', ARRAY['zoning', 'land use', 'planning permit', 'development approval', 'master plan']::text[], ARRAY['governance', 'law']::text[], 210),
  ('municipal', 'Municipal / Local Government', 'local', 'City and local services: local roads, waste, local permits, neighborhood amenities, and municipal bylaws.', ARRAY['city hall', 'mayor', 'municipal', 'local council', 'neighborhood', 'trash', 'streetlight', 'park local']::text[], ARRAY['governance']::text[], 220),
  ('police', 'Police / Law Enforcement', 'local', 'Local law enforcement operations, crime reports, community policing, and public safety response.', ARRAY['police', 'crime', 'theft', 'assault report', '911', 'law enforcement', 'patrol']::text[], ARRAY['law', 'governance']::text[], 230),
  ('utilities', 'Utilities / Public Services', 'local', 'Water/sewer/electric utility service quality, billing disputes with public utilities, and service outages.', ARRAY['utility', 'sewer', 'water bill', 'power company', 'outage', 'meter']::text[], ARRAY['governance']::text[], 240),
  ('elections', 'Elections / Electoral Commission', 'independent', 'Election administration, voter registration, ballots, and electoral integrity processes.', ARRAY['election', 'voting', 'ballot', 'voter registration', 'electoral commission', 'polling']::text[], ARRAY['governance', 'law']::text[], 250),
  ('ombudsman', 'Ombudsman / Anti-Corruption / Oversight', 'independent', 'Complaint review against public bodies, integrity investigations, and citizen oversight channels.', ARRAY['ombudsman', 'corruption', 'bribery', 'integrity', 'whistleblower', 'maladministration']::text[], ARRAY['law', 'governance']::text[], 260),
  ('veterans', 'Veterans Affairs', 'national', 'Veterans benefits, rehabilitation, and support services for former service members.', ARRAY['veteran', 'veterans affairs', 'military pension', 'service member support']::text[], ARRAY['medicine', 'governance']::text[], 270),
  ('family_youth', 'Family / Youth / Gender Equality', 'national', 'Family policy, youth programs, gender equality frameworks, and related social inclusion.', ARRAY['family policy', 'youth', 'gender equality', 'child protection', 'domestic violence support']::text[], ARRAY['governance', 'medicine', 'law']::text[], 280),
  ('tourism_sport', 'Tourism / Sport', 'national', 'Tourism promotion, hospitality standards, and national sports policy.', ARRAY['tourism', 'hotel', 'visitor', 'sport', 'stadium', 'athletics']::text[], ARRAY['governance']::text[], 290),
  ('natural_resources', 'Natural Resources / Mining / Oceans', 'national', 'Mining, forestry, fisheries, oceans, and extractive-resource licensing.', ARRAY['mining', 'forestry', 'fisheries', 'oceans', 'natural resources', 'extractive']::text[], ARRAY['governance']::text[], 300),
  ('civizen_network', 'Civizen Network Stewardship', 'civizen', 'Issues about the Civizen platform, member credentials, community charter processes, and voluntary network governance — not a state ministry.', ARRAY['civizen', 'platform bug', 'member id', 'world citizen card', 'nela', 'civizen app']::text[], ARRAY['governance']::text[], 900)
ON CONFLICT (id) DO UPDATE SET
  name = excluded.name,
  tier = excluded.tier,
  responsibilities = excluded.responsibilities,
  keywords = excluded.keywords,
  related_profession_ids = excluded.related_profession_ids,
  sort_order = excluded.sort_order;

-- Expand problem statuses and add routing columns
ALTER TABLE public.solution_problems
  DROP CONSTRAINT IF EXISTS solution_problems_status_check;

ALTER TABLE public.solution_problems
  ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'discuss',
  ADD COLUMN IF NOT EXISTS authority_id text REFERENCES public.solution_authorities(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS category_confidence numeric(4,3),
  ADD COLUMN IF NOT EXISTS category_keywords text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS assignee_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS routing_note text;

UPDATE public.solution_problems
SET mode = 'discuss'
WHERE mode IS NULL OR mode = '';

ALTER TABLE public.solution_problems
  DROP CONSTRAINT IF EXISTS solution_problems_mode_check;

ALTER TABLE public.solution_problems
  ADD CONSTRAINT solution_problems_mode_check CHECK (mode IN ('discuss', 'solve'));

ALTER TABLE public.solution_problems
  ADD CONSTRAINT solution_problems_status_check CHECK (status IN (
    'open',
    'debating',
    'consensus',
    'split',
    'closed',
    'categorizing',
    'routed',
    'seeking_professional',
    'accepted',
    'in_progress',
    'resolved'
  ));

CREATE TABLE IF NOT EXISTS public.solution_routing_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id uuid NOT NULL REFERENCES public.solution_problems(id) ON DELETE CASCADE,
  from_status text,
  to_status text NOT NULL,
  note text,
  actor_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS solution_routing_events_problem_created_idx
  ON public.solution_routing_events (problem_id, created_at);

CREATE INDEX IF NOT EXISTS solution_problems_mode_status_idx
  ON public.solution_problems (mode, status, created_at DESC);

ALTER TABLE public.solution_authorities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solution_routing_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can read solution authorities" ON public.solution_authorities;
CREATE POLICY "Members can read solution authorities"
  ON public.solution_authorities FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Members can read solution routing events" ON public.solution_routing_events;
CREATE POLICY "Members can read solution routing events"
  ON public.solution_routing_events FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Members can insert solution routing events" ON public.solution_routing_events;
CREATE POLICY "Members can insert solution routing events"
  ON public.solution_routing_events FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.solution_problems p
      JOIN public.profiles pr ON pr.id = p.author_id
      WHERE p.id = problem_id AND pr.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles pr
      WHERE pr.id = actor_profile_id AND pr.user_id = auth.uid()
    )
  );

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.solution_routing_events;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
