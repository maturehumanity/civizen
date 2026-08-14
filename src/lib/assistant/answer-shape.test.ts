import { describe, expect, it } from 'vitest';

import { detectQuestionShape, shapeAnswerToQuestion } from '@/lib/assistant/answer-shape';

const PATH =
  'Open Market > Agreements and tap + beside the title. Choose a type such as General.';

describe('question shape', () => {
  it('treats how/where as path-first', () => {
    expect(detectQuestionShape('How can I sign an agreement with anyone through Civizen?')).toBe('how');
    expect(detectQuestionShape('Where do I create an agreement?')).toBe('how');
  });

  it('treats can/does as yes/no', () => {
    expect(detectQuestionShape('Can I sign an agreement with anyone through Civizen?')).toBe('yesno');
    expect(detectQuestionShape('Does Civizen have agreements?')).toBe('yesno');
  });
});

describe('shapeAnswerToQuestion', () => {
  it('adds Yes before a path when the member asked can/does', () => {
    expect(shapeAnswerToQuestion('Can I sign an agreement with anyone through Civizen?', PATH)).toBe(
      `Yes. ${PATH}`,
    );
  });

  it('keeps a how-question on the path', () => {
    expect(shapeAnswerToQuestion('How can I sign an agreement with anyone through Civizen?', PATH)).toBe(PATH);
    expect(shapeAnswerToQuestion('How can I sign an agreement?', `Yes. ${PATH}`)).toBe(PATH);
  });

  it('does not invent Yes for answers that are not a path', () => {
    expect(
      shapeAnswerToQuestion(
        'Does Civizen support legally binding PKI notary stamps?',
        'Civizen supports native electronic signing. This is not a certified PKI digital signature.',
      ),
    ).not.toMatch(/^Yes\./);
  });
});
