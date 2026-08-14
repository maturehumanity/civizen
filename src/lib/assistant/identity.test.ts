import { describe, expect, it } from 'vitest';

import { CANONICAL_CIVIZEN_IDENTITY, classifyAssistantTopic } from '@/lib/assistant/identity';

describe('classifyAssistantTopic', () => {
  it('routes identity and one-sentence questions to identity', () => {
    expect(classifyAssistantTopic("What's Civizen in one sentence?")).toBe('identity');
    expect(classifyAssistantTopic('What is Civizen?')).toBe('identity');
    expect(classifyAssistantTopic('How would you describe Civizen?')).toBe('identity');
    expect(classifyAssistantTopic('What kind of system is Civizen?')).toBe('identity');
    expect(classifyAssistantTopic('What is the purpose of Civizen?')).toBe('identity');
  });

  it('routes current-capability questions away from identity', () => {
    expect(classifyAssistantTopic('What can I do in Civizen right now?')).toBe('current_capability');
    expect(classifyAssistantTopic('What can I currently do in Civizen?')).toBe('current_capability');
  });

  it('treats narrow redefinition as an identity comparison', () => {
    expect(classifyAssistantTopic('Is Civizen basically a project collaboration platform?')).toBe('identity');
  });

  it('leaves feature how-questions as other', () => {
    expect(classifyAssistantTopic('How does Civizen governance work?')).toBe('other');
  });
});

describe('canonical identity sentence', () => {
  it('names participation across learning through shared-system improvement', () => {
    expect(CANONICAL_CIVIZEN_IDENTITY).toMatch(/open participatory system/i);
    expect(CANONICAL_CIVIZEN_IDENTITY).toMatch(/learns, contributes, collaborates, governs/);
  });
});
