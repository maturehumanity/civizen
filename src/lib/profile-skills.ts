import { getSkillDescription } from '@/lib/profile-skill-descriptions';

export type SkillKind = 'hard' | 'soft';

/**
 * Curated hard-skill suggestions for the Profile Skills sentence picker.
 * Prefer specific, searchable labels (e.g. “Driving (car)”) over vague umbrella terms.
 * Not exhaustive — users can still add custom skills.
 */
export const PROFILE_HARD_SKILL_SEEDS = [
  // Accounting & finance
  'Accounting',
  'Accounts payable',
  'Accounts receivable',
  'Auditing',
  'Bookkeeping',
  'Budgeting',
  'Cost accounting',
  'Financial analysis',
  'Financial modeling',
  'Fundraising',
  'Grant writing',
  'Investment analysis',
  'Payroll administration',
  'Tax preparation',
  'Treasury management',

  // Administration & operations
  'Archiving',
  'Contract management',
  'Customer service systems',
  'Inventory management',
  'Office administration',
  'Procurement',
  'Quality assurance',
  'Quality control',
  'Records management',
  'Supply chain management',
  'Vendor management',

  // Agriculture & environment
  'Agricultural machinery operation',
  'Agroecology',
  'Beekeeping',
  'Crop management',
  'Environmental assessment',
  'Forestry',
  'Irrigation systems',
  'Livestock management',
  'Organic farming',
  'Soil science',
  'Sustainable agriculture',
  'Water resource management',
  'Wildlife management',

  // Construction & trades
  'Blueprint reading',
  'Bricklaying',
  'Carpentry',
  'Concrete work',
  'Construction estimating',
  'Construction supervision',
  'Drywall installation',
  'Electrical installation',
  'Electrical troubleshooting',
  'Flooring installation',
  'Glazing',
  'HVAC installation',
  'HVAC maintenance',
  'Insulation installation',
  'Masonry',
  'Painting and finishing',
  'Pipefitting',
  'Plumbing',
  'Roofing',
  'Scaffolding',
  'Surveying',
  'Tile setting',
  'Welding (arc)',
  'Welding (MIG)',
  'Welding (TIG)',

  // Design & creative production
  '3D modeling',
  'Animation',
  'Audio engineering',
  'Brand design',
  'CAD drafting',
  'Graphic design',
  'Illustration',
  'Industrial design',
  'Interior design',
  'Motion graphics',
  'Photography',
  'Print production',
  'Product design',
  'UI design',
  'UX design',
  'UX research',
  'Video editing',
  'Videography',

  // Education & training methods
  'Adult education',
  'Assessment design',
  'Curriculum design',
  'Early childhood education',
  'Instructional design',
  'Learning management systems',
  'Special education support',
  'Training delivery',
  'Workshop design',

  // Emergency, safety & security
  'CPR',
  'Crisis response',
  'Emergency medical technician (EMT)',
  'Emergency preparedness',
  'Fire safety',
  'First aid',
  'Hazardous materials handling',
  'Incident command',
  'Lifeguarding',
  'Occupational health and safety',
  'Paramedic practice',
  'Search and rescue',
  'Security operations',
  'Workplace safety auditing',

  // Engineering & manufacturing
  'CNC machining',
  'Electrical engineering',
  'Electronics repair',
  'Industrial maintenance',
  'Lean manufacturing',
  'Mechanical engineering',
  'Mechatronics',
  'Process engineering',
  'Product prototyping',
  'Robotics',
  'Six Sigma',

  // Healthcare & clinical support
  'Care coordination',
  'Clinical documentation',
  'Dental assisting',
  'Health education',
  'Laboratory techniques',
  'Medical coding',
  'Medical interpreting',
  'Nursing',
  'Patient intake',
  'Pharmacy technician skills',
  'Phlebotomy',
  'Public health analysis',
  'Radiography',
  'Vaccination administration',

  // Hospitality & food
  'Baking',
  'Bartending',
  'Catering',
  'Cooking',
  'Food safety (HACCP)',
  'Hotel operations',
  'Restaurant management',

  // Languages & communication crafts
  'Arabic',
  'Armenian',
  'Chinese (Mandarin)',
  'Copyediting',
  'Copywriting',
  'English',
  'French',
  'German',
  'Interpretation (consecutive)',
  'Interpretation (simultaneous)',
  'Persian',
  'Portuguese',
  'Russian',
  'Spanish',
  'Technical writing',
  'Translation',
  'Turkish',

  // Legal & governance practice
  'Case management',
  'Compliance',
  'Constitutional literacy',
  'Legal research',
  'Legislative drafting',
  'Mediation (formal)',
  'Notary services',
  'Paralegal research',
  'Policy analysis',
  'Policy drafting',
  'Regulatory affairs',

  // Maritime & watercraft
  'Boat operation',
  'Commercial fishing',
  'Marine navigation',
  'Sailing',
  'Shipboard operations',

  // Piloting & aviation
  'Aircraft maintenance',
  'Air traffic coordination',
  'Flight instruction',
  'Pilot (airplane, commercial)',
  'Pilot (airplane, private)',
  'Pilot (drone / UAV)',
  'Pilot (helicopter)',
  'Pilot (instrument flight / IFR)',
  'Pilot (multi-engine)',

  // Driving & ground vehicles
  'Ambulance driving',
  'Bus driving',
  'Defensive driving',
  'Driving (car / light vehicle)',
  'Driving instruction',
  'Forklift operation',
  'Heavy equipment operation',
  'Motorcycle riding',
  'Off-road vehicle operation',
  'Taxi / rideshare driving',
  'Tractor operation',
  'Trailer towing',
  'Truck driving (CDL Class A)',
  'Truck driving (CDL Class B)',
  'Truck driving (CDL Class C)',

  // Project, product & business methods
  'Agile facilitation',
  'Business analysis',
  'Change management',
  'Design thinking',
  'Market research',
  'Product management',
  'Project management',
  'Requirements gathering',
  'Risk management',
  'Scrum mastery',
  'Strategic planning tools',

  // Research & data
  'Data analysis',
  'Data visualization',
  'Econometrics',
  'Ethnographic research',
  'Experiment design',
  'GIS mapping',
  'Qualitative research',
  'Quantitative research',
  'Research',
  'Statistical analysis',
  'Survey design',

  // Sales & marketing operations
  'Account management',
  'Digital marketing',
  'Email marketing',
  'SEO',
  'Social media management',
  'Sales operations',

  // Software, IT, AI & digital systems
  'AI engineering',
  'AI ethics',
  'AI evaluation / red teaming',
  'AI product management',
  'AI safety',
  'AI systems design',
  'API design',
  'Artificial intelligence (AI)',
  'AWS',
  'Azure',
  'C',
  'C++',
  'Cloud architecture',
  'Computer vision',
  'Cybersecurity',
  'Database administration',
  'Deep learning',
  'DevOps',
  'Docker',
  'Feature engineering',
  'Generative AI',
  'Git',
  'Google Cloud',
  'HTML / CSS',
  'IT support',
  'Java',
  'JavaScript',
  'Kubernetes',
  'Large language models (LLMs)',
  'Linux administration',
  'Machine learning',
  'MLOps',
  'Mobile app development',
  'Model deployment',
  'Natural language processing (NLP)',
  'Network administration',
  'Neural networks',
  'Node.js',
  'PHP',
  'Prompt engineering',
  'Python',
  'RAG systems',
  'React',
  'Recommendation systems',
  'Reinforcement learning',
  'Speech recognition / synthesis',
  'SQL',
  'System administration',
  'TypeScript',
  'Web development',

  // Social services & civic practice tools
  'Case documentation',
  'Counseling techniques',
  'Crisis hotline support',
  'Election administration',
  'Needs assessment',
  'Program evaluation',
  'Social work casework',

  // Sports, recreation & performing arts (applied)
  'Choreography',
  'Coaching (sports)',
  'Fitness instruction',
  'Music performance',
  'Stage production',
  'Theater direction',
] as const;

/**
 * Curated soft-skill suggestions for the Profile Skills sentence picker.
 * Interpersonal, civic, and behavioral capabilities (not tool-specific).
 */
export const PROFILE_SOFT_SKILL_SEEDS = [
  'Accountability',
  'Active listening',
  'Adaptability',
  'Advocacy',
  'AI literacy',
  'Attention to detail',
  'Boundary setting',
  'Civic engagement',
  'Collaboration',
  'Communication',
  'Community organizing',
  'Compassion',
  'Conflict de-escalation',
  'Conflict resolution',
  'Consensus building',
  'Creativity',
  'Critical thinking',
  'Cross-cultural communication',
  'Curiosity',
  'Customer service',
  'Decision making',
  'Diplomacy',
  'Emotional intelligence',
  'Empathy',
  'Ethical judgment',
  'Facilitation',
  'Feedback giving',
  'Feedback receiving',
  'Flexibility',
  'Humility',
  'Inclusion',
  'Initiative',
  'Integrity',
  'Intercultural competence',
  'Interpersonal communication',
  'Leadership',
  'Mentoring',
  'Motivation',
  'Negotiation',
  'Patience',
  'Persuasion',
  'Problem solving',
  'Public speaking',
  'Reliability',
  'Resilience',
  'Respectfulness',
  'Responsibility',
  'Self-awareness',
  'Self-management',
  'Servant leadership',
  'Stakeholder engagement',
  'Storytelling',
  'Strategic planning',
  'Stress management',
  'Systems thinking',
  'Team building',
  'Teamwork',
  'Teaching',
  'Time management',
  'Trust building',
  'Volunteer coordination',
  'Written communication',
] as const;

/** @deprecated Prefer PROFILE_HARD_SKILL_SEEDS / PROFILE_SOFT_SKILL_SEEDS. */
export const PROFILE_SKILL_SEEDS = [
  ...PROFILE_HARD_SKILL_SEEDS,
  ...PROFILE_SOFT_SKILL_SEEDS,
] as const;

const SOFT_SKILL_LOOKUP = new Set(
  PROFILE_SOFT_SKILL_SEEDS.map((name) => name.toLowerCase()),
);

export function isKnownSoftSkill(name: string): boolean {
  return SOFT_SKILL_LOOKUP.has(name.trim().toLowerCase());
}

const HARD_SKILL_LOOKUP = new Set(
  PROFILE_HARD_SKILL_SEEDS.map((name) => name.toLowerCase()),
);

export function isKnownHardSkill(name: string): boolean {
  return HARD_SKILL_LOOKUP.has(name.trim().toLowerCase());
}

/** Soft catalog wins; unknown custom names default to hard. */
export function resolveSkillKind(name: string): SkillKind {
  return isKnownSoftSkill(name) ? 'soft' : 'hard';
}

/** English list join: "A", "A and B", "A, B, and C". */
export function formatEnglishList(items: string[]): string {
  const cleaned = items.map((item) => item.trim()).filter(Boolean);
  if (cleaned.length === 0) return '';
  if (cleaned.length === 1) return cleaned[0];
  if (cleaned.length === 2) return `${cleaned[0]} and ${cleaned[1]}`;
  return `${cleaned.slice(0, -1).join(', ')}, and ${cleaned[cleaned.length - 1]}`;
}

export function normalizeSkillNames(names: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of names) {
    const name = raw.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(name);
  }
  return result;
}

/**
 * Split a legacy flat skill list into hard/soft using the soft seed catalog.
 * Unknown names default to hard.
 */
export function partitionLegacySkillNames(names: string[]): {
  hard: string[];
  soft: string[];
} {
  const hard: string[] = [];
  const soft: string[] = [];
  for (const name of normalizeSkillNames(names)) {
    if (isKnownSoftSkill(name)) soft.push(name);
    else hard.push(name);
  }
  return { hard, soft };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Prefer whole-token matches for short queries (e.g. “AI” should not match “Email”). */
function skillMatchesQuery(name: string, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const nameLower = name.toLowerCase();
  const descLower = getSkillDescription(name).toLowerCase();
  const tokenPattern = new RegExp(`(^|[^a-z0-9])${escapeRegExp(q)}([^a-z0-9]|$)`, 'i');

  if (q.length <= 2) {
    if (tokenPattern.test(name) || tokenPattern.test(descLower)) return true;
    if (q === 'ai') {
      return (
        nameLower.includes('artificial intelligence') ||
        descLower.includes('artificial intelligence') ||
        descLower.includes(' machine learning') ||
        nameLower.includes('machine learning') ||
        nameLower.includes('llm') ||
        nameLower.includes('nlp') ||
        nameLower.includes('mlops') ||
        nameLower.includes('generative ai') ||
        nameLower.includes('deep learning') ||
        nameLower.includes('neural') ||
        nameLower.includes('prompt engineering') ||
        nameLower.includes('computer vision') ||
        nameLower.includes('reinforcement learning') ||
        nameLower.includes('recommendation systems') ||
        nameLower.includes('feature engineering') ||
        nameLower.includes('model deployment') ||
        nameLower.includes('rag systems') ||
        nameLower.includes('speech recognition') ||
        descLower.includes('generative') ||
        descLower.includes('neural network')
      );
    }
    return false;
  }

  return nameLower.includes(q) || descLower.includes(q);
}

export function filterProfileSkills(
  query: string,
  kind: SkillKind,
  selected: string[] = [],
  otherSelected: string[] = [],
): string[] {
  const q = query.trim().toLowerCase();
  const selectedLower = new Set(selected.map((s) => s.toLowerCase()));
  const otherLower = new Set(otherSelected.map((s) => s.toLowerCase()));
  const seeds = kind === 'hard' ? PROFILE_HARD_SKILL_SEEDS : PROFILE_SOFT_SKILL_SEEDS;
  const pool = [
    ...seeds,
    ...selected.filter(
      (name) => !seeds.some((seed) => seed.toLowerCase() === name.toLowerCase()),
    ),
  ].filter((name) => !otherLower.has(name.toLowerCase()));

  const filtered = q ? pool.filter((name) => skillMatchesQuery(name, q)) : [...pool];

  return filtered.sort((a, b) => {
    const aSel = selectedLower.has(a.toLowerCase()) ? 0 : 1;
    const bSel = selectedLower.has(b.toLowerCase()) ? 0 : 1;
    if (aSel !== bSel) return aSel - bSel;
    return a.localeCompare(b);
  });
}

/** Total declared skills across hard and soft lists. */
export function countDeclaredSkills(hard: string[] = [], soft: string[] = []): number {
  return normalizeSkillNames(hard).length + normalizeSkillNames(soft).length;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

/** Count skills from a profile_skills_entries row (hard/soft or legacy flat). */
export function countSkillsFromEntry(row: {
  hard_skill_names?: unknown;
  soft_skill_names?: unknown;
  skill_names?: unknown;
} | null | undefined): number {
  const names = declaredSkillNamesFromEntry(row);
  return names.length;
}

export function declaredSkillNamesFromEntry(row: {
  hard_skill_names?: unknown;
  soft_skill_names?: unknown;
  skill_names?: unknown;
} | null | undefined): string[] {
  if (!row) return [];
  const hard = asStringArray(row.hard_skill_names);
  const soft = asStringArray(row.soft_skill_names);
  if (hard.length > 0 || soft.length > 0) return normalizeSkillNames([...hard, ...soft]);
  return normalizeSkillNames(asStringArray(row.skill_names));
}
