import Anthropic from '@anthropic-ai/sdk';

let _client: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  if (!_client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not set');
    }
    _client = new Anthropic({ apiKey });
  }
  return _client;
}

/**
 * Call Claude with a system prompt and user message.
 * Returns the text content of the response.
 */
export async function callClaude(opts: {
  system: string;
  userMessage: string;
  maxTokens?: number;
  model?: string;
}): Promise<string> {
  const client = getAnthropicClient();
  const response = await client.messages.create({
    model: opts.model || 'claude-sonnet-4-20250514',
    max_tokens: opts.maxTokens || 4096,
    system: opts.system,
    messages: [{ role: 'user', content: opts.userMessage }],
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  return textBlock?.text || '';
}
