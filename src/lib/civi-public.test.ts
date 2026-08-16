import { describe, expect, it } from 'vitest';

import { sanitizeCiviPublicHistory } from '@/lib/civi-public';

describe('sanitizeCiviPublicHistory', () => {
  it('keeps only recent user and assistant turns', () => {
    const history = Array.from({ length: 20 }, (_, index) => ({
      role: index % 2 === 0 ? ('user' as const) : ('assistant' as const),
      content: `turn ${index}`,
    }));
    const next = sanitizeCiviPublicHistory(history);
    expect(next).toHaveLength(12);
    expect(next[0]?.content).toBe('turn 8');
    expect(next.at(-1)?.content).toBe('turn 19');
  });

  it('drops empty and invalid turns', () => {
    const next = sanitizeCiviPublicHistory([
      { role: 'user', content: '  ' },
      { role: 'assistant', content: 'Civizen is a participatory system.' },
      { role: 'user', content: 'What is Civizen?' },
    ]);
    expect(next.map((turn) => turn.content)).toEqual([
      'Civizen is a participatory system.',
      'What is Civizen?',
    ]);
  });
});
