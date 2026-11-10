import Anthropic from '@anthropic-ai/sdk';
import type { ReplyProvider } from './types.ts';
import { config } from '../../shared/config.ts';

// Reads ANTHROPIC_API_KEY (or another configured Anthropic credential) on the server only.
const client = new Anthropic();

export const anthropicProvider: ReplyProvider = {
  name: 'anthropic',
  async *reply(messages, system, signal) {
    const stream = client.beta.messages.stream(
      {
        model: config.providers.anthropicModel,
        max_tokens: 4000,
        system,
        messages,
        // Short conversational replies: low effort keeps latency down for voice.
        output_config: { effort: 'low' },
        // If the model declines, the API re-runs the request on a fallback model.
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
      } as Parameters<typeof client.beta.messages.stream>[0],
      { signal },
    );
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        yield event.delta.text;
      }
    }
  },
};
