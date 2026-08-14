import { describe, expect, it } from 'vitest';

import { splitAssistantMessageBlocks } from '@/lib/split-assistant-message';

describe('splitAssistantMessageBlocks', () => {
  it('keeps a single-paragraph answer as primary', () => {
    expect(splitAssistantMessageBlocks('Open Market > Agreements and tap +.')).toEqual({
      primary: 'Open Market > Agreements and tap +.',
      details: [],
    });
  });

  it('treats text after a blank line as secondary detail', () => {
    const split = splitAssistantMessageBlocks(
      'Yes. Open Market > Agreements and tap + beside the title.\n\nSupported types open a readable agreement document.',
    );
    expect(split.primary).toBe('Yes. Open Market > Agreements and tap + beside the title.');
    expect(split.details).toEqual(['Supported types open a readable agreement document.']);
  });

  it('dims Supported types notes even without a blank line', () => {
    const split = splitAssistantMessageBlocks(
      'Yes. Open Market > Agreements and tap +. Supported types open a readable agreement document. Ordinary Marketplace purchases stay as orders.',
    );
    expect(split.primary).toBe('Yes. Open Market > Agreements and tap +.');
    expect(split.details[0]).toMatch(/^Supported types/);
    expect(split.details[0]).toMatch(/Ordinary Marketplace/);
  });
});
