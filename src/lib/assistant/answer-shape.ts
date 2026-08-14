export type QuestionShape = 'yesno' | 'how' | 'other';

export function detectQuestionShape(query: string): QuestionShape {
  const text = query.trim().replace(/^[^A-Za-z0-9]+/, '');
  if (!text) return 'other';
  if (/^(how|where)\b/i.test(text)) return 'how';
  if (/^(what is the (way|path|process)|walk me through|show me how)\b/i.test(text)) return 'how';
  if (/^(can|could|does|do|is|are|will|would|should|may|might)\b/i.test(text)) return 'yesno';
  if (/\bis it possible\b/i.test(text)) return 'yesno';
  return 'other';
}

export function shapeAnswerToQuestion(query: string, answer: string): string {
  const trimmed = answer.trim();
  if (!trimmed) return trimmed;
  const shape = detectQuestionShape(query);
  if (shape === 'how') return trimmed.replace(/^Yes\.\s+/i, '');
  if (shape === 'yesno' && /^Open\s/i.test(trimmed) && !/^(yes|no)\b/i.test(trimmed)) {
    return `Yes. ${trimmed}`;
  }
  return trimmed;
}
