import type { RequestInput, Context } from '../core/types'
import type { FormatAdapter } from '../core/format'

const DEFAULT_TEXT = 'Hello from ProjectEio! This is a mock response.'

export class AnthropicFormat implements FormatAdapter {
  name = 'anthropic'

  parseRequest(body: Record<string, unknown>): RequestInput {
    return {
      model: (body["model"] as string) ?? 'unknown',
      messages: (body["messages"] as any[])?.map((m: any) => ({
        role: m.role,
        content: m.content,
      })) ?? [],
      stream: (body["stream"] as boolean) ?? false,
      max_tokens: (body["max_tokens"] as number) ?? 1024,
      temperature: (body["temperature"] as number) ?? undefined,
    }
  }

  formatResponse(ctx: Context) {
    return {
      id: `msg_${ctx.requestId}`,
      type: 'message',
      role: 'assistant',
      content: [{ type: 'text', text: ctx.output?.content ?? DEFAULT_TEXT }],
      model: ctx.input.model,
      stop_reason: ctx.output?.finish_reason ?? 'end_turn',
      usage: { input_tokens: 0, output_tokens: 0 },
    }
  }

  formatStreamChunk(_ctx: Context, chunk: string) {
    return {
      type: 'content_block_delta',
      delta: { type: 'text_delta', text: chunk },
    }
  }

  getContentType() {
    return 'application/json'
  }

  getStreamChunkType() {
    return 'sse' as const
  }
}