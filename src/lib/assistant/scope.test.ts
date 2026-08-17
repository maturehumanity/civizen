import { describe, expect, it } from 'vitest';

import { isRelevantToCivizen, textLooksCivizenRelated } from '@/lib/assistant/scope';

describe('Civi scope', () => {
  it('treats peace and wars questions as Civizen questions', () => {
    expect(textLooksCivizenRelated('How can we stop wars?')).toBe(true);
    expect(isRelevantToCivizen('How can we stop wars?', [{ role: 'user', content: 'How can we stop wars?' }])).toBe(
      true,
    );
  });

  it('still refuses unrelated questions', () => {
    expect(isRelevantToCivizen('What is the weather in Paris tomorrow?', [
      { role: 'user', content: 'What is the weather in Paris tomorrow?' },
    ])).toBe(false);
  });
});
