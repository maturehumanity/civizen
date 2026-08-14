const DETAIL_START =
  /\b(?:Supported types|Ordinary Marketplace|This is not a certified|This is not the Solution Record)\b/;

export function splitAssistantMessageBlocks(content: string): { primary: string; details: string[] } {
  const trimmed = content.trim();
  if (!trimmed) return { primary: '', details: [] };

  const blank = trimmed.split(/\n\n+/).map((block) => block.trim()).filter(Boolean);
  if (blank.length > 1) {
    return { primary: blank[0], details: blank.slice(1) };
  }

  const match = trimmed.match(DETAIL_START);
  if (match?.index && match.index > 12) {
    return {
      primary: trimmed.slice(0, match.index).trim(),
      details: [trimmed.slice(match.index).trim()],
    };
  }

  return { primary: trimmed, details: [] };
}
