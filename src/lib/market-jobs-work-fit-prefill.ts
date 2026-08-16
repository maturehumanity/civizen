/** Parse Marketplace Jobs query params produced by approved Work Fit prefill. */
export function parseWorkFitJobsQuery(search: string): { jobTypes: string[]; notes: string } {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  if (params.get('from') !== 'work-fit') return { jobTypes: [], notes: '' };
  const jobTypes = (params.get('jobTypes') ?? '')
    .split('|')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 3);
  const notes = (params.get('notes') ?? '').trim().slice(0, 280);
  return { jobTypes, notes };
}
