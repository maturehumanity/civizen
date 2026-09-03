/**
 * Live Gemini adapter for the Coding Agent loop. No host/shell access.
 */
import {
  CODING_AGENT_TOOL_SPECS,
  createInstructionDrivenFakeModel,
  type CodingAgentMessage,
  type CodingAgentModelAdapter,
  type CodingAgentToolCall,
} from '@/lib/matters-coding-model';

type GeminiPart = {
  text?: string;
  thoughtSignature?: string;
  thought_signature?: string;
  functionCall?: {
    name?: string;
    args?: Record<string, unknown>;
    thoughtSignature?: string;
    thought_signature?: string;
  };
  functionResponse?: { name: string; response: Record<string, unknown> };
};

/** Gemini functionDeclarations reject JSON Schema fields such as additionalProperties. */
export function toGeminiToolParameters(parameters: Record<string, unknown>): Record<string, unknown> {
  const walk = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(walk);
    if (!value || typeof value !== 'object') return value;
    const out: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      if (key === 'additionalProperties') continue;
      out[key] = walk(child);
    }
    return out;
  };
  return walk(parameters) as Record<string, unknown>;
}

function thoughtSignatureOf(part: {
  thoughtSignature?: string;
  thought_signature?: string;
  functionCall?: { thoughtSignature?: string; thought_signature?: string };
}): string | undefined {
  return (
    part.functionCall?.thoughtSignature
    || part.functionCall?.thought_signature
    || part.thoughtSignature
    || part.thought_signature
    || undefined
  );
}

function toGeminiContents(messages: CodingAgentMessage[]): Array<{ role: 'user' | 'model'; parts: GeminiPart[] }> {
  const contents: Array<{ role: 'user' | 'model'; parts: GeminiPart[] }> = [];
  for (const message of messages) {
    if (message.role === 'user') {
      contents.push({ role: 'user', parts: [{ text: message.content }] });
      continue;
    }
    if (message.role === 'assistant') {
      const parts: GeminiPart[] = [];
      if (message.content) parts.push({ text: message.content });
      for (const call of message.toolCalls ?? []) {
        const part: GeminiPart = {
          functionCall: {
            name: call.name,
            args: call.arguments,
          },
        };
        if (call.thoughtSignature) {
          part.thoughtSignature = call.thoughtSignature;
        }
        parts.push(part);
      }
      contents.push({ role: 'model', parts: parts.length ? parts : [{ text: '' }] });
      continue;
    }
    const last = contents[contents.length - 1];
    const part: GeminiPart = {
      functionResponse: {
        name: message.toolName ?? 'unknown',
        response: { result: message.content },
      },
    };
    if (last?.role === 'user' && last.parts.some((item) => item.functionResponse)) {
      last.parts.push(part);
    } else {
      contents.push({ role: 'user', parts: [part] });
    }
  }
  return contents;
}

export function createGeminiCodingAgentModel(input: {
  apiKey: string;
  model?: string;
}): CodingAgentModelAdapter {
  const model = input.model || 'gemini-2.5-flash-lite';
  return {
    id: 'gemini',
    label: 'provider',
    modelRef: model,
    async complete(request) {
      const payload = {
        systemInstruction: { parts: [{ text: request.system }] },
        contents: toGeminiContents(request.messages),
        tools: [{
          functionDeclarations: CODING_AGENT_TOOL_SPECS.map((tool) => ({
            name: tool.name,
            description: tool.description,
            parameters: toGeminiToolParameters(tool.parameters),
          })),
        }],
        toolConfig: { functionCallingConfig: { mode: 'AUTO' } },
        generationConfig: { temperature: 0.2, maxOutputTokens: 4096 },
      };
      const endpoint =
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(input.apiKey)}`;
      const call = () => fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      let response = await call();
      if (!response.ok && (response.status === 429 || response.status === 503)) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        response = await call();
      }
      if (!response.ok) {
        const detail = (await response.text()).replace(/key=[^&\s"]+/gi, 'key=<redacted>').slice(0, 400);
        throw new Error(`Gemini Coding Agent request failed (${response.status}): ${detail}`);
      }
      const json = await response.json() as {
        candidates?: Array<{ content?: { parts?: GeminiPart[] } }>;
      };
      const parts = json.candidates?.[0]?.content?.parts ?? [];
      const toolCalls: CodingAgentToolCall[] = parts
        .filter((part) => part.functionCall?.name)
        .map((part) => ({
          name: String(part.functionCall?.name),
          arguments: (part.functionCall?.args ?? {}) as Record<string, unknown>,
          thoughtSignature: thoughtSignatureOf(part),
        }));
      const text = parts.map((part) => part.text ?? '').join('').trim();
      if (toolCalls.length === 0 && text) {
        return { text, toolCalls: [{ name: 'finish', arguments: { summary: text.slice(0, 2000), concerns: [] } }] };
      }
      return { text: text || undefined, toolCalls };
    },
  };
}

export function resolveCodingAgentModel(input: {
  stage: 'plan' | 'execute';
  instructions: string;
  env?: NodeJS.ProcessEnv;
}): CodingAgentModelAdapter {
  const env = input.env ?? process.env;
  if (env.CIVIZEN_CODING_MODEL === 'fake') {
    return createInstructionDrivenFakeModel(input.instructions, input.stage);
  }
  const apiKey = env.GEMINI_API_KEY?.trim();
  if (apiKey) {
    return createGeminiCodingAgentModel({ apiKey, model: env.GEMINI_MODEL });
  }
  if (input.stage === 'plan') {
    return createInstructionDrivenFakeModel(input.instructions, 'plan');
  }
  throw new Error('Coding Agent execute requires a live model (GEMINI_API_KEY). Tests may set CIVIZEN_CODING_MODEL=fake.');
}
