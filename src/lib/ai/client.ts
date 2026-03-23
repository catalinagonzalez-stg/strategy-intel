import OpenAI from 'openai';

let _client: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (!_client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    _client = new OpenAI({ apiKey });
  }
  return _client;
}

/**
 * Call OpenAI with a system prompt and user message.
 * Returns the text content of the response.
 */
export async function callLLM(opts: {
  system: string;
  userMessage: string;
  maxTokens?: number;
  model?: string;
}): Promise<string> {
  const client = getOpenAIClient();
  const response = await client.chat.completions.create({
    model: opts.model || 'gpt-4o',
    max_tokens: opts.maxTokens || 4096,
    messages: [
      { role: 'system', content: opts.system },
      { role: 'user', content: opts.userMessage },
    ],
  });

  return response.choices[0]?.message?.content || '';
}
