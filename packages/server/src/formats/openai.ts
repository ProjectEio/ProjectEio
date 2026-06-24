import type { Context, RequestInput } from '../core/types'
import type { FormatAdapter } from '../core/format'

const DEFAULT_RESPONSE = 'Hello from ProjectEio! This is a mock response.'

export class OpenAIFormat implements FormatAdapter {
  name = 'openai'

  parseRequest(body: Record<string, unknown>): RequestInput {
    return {
      model: (body["model"] as string) ?? 'unknown',
      messages: (body["messages"] as any[])?.map((m) => ({
        role: m.role,
        content: m.content,
      })) ?? [],
      stream: (body["stream"] as boolean) ?? false,
      max_tokens: (body["max_tokens"] as number) ?? undefined,
      temperature: (body["temperature"] as number) ?? undefined,
    }
  }

  formatResponse(ctx: Context) {
    return {
      id: `chatcmpl-${ctx.requestId}`,
      object: 'chat.completion',
      created: Date.now(),
      model: ctx.input.model,
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: ctx.output?.content ?? DEFAULT_RESPONSE,
          },
          finish_reason: ctx.output?.finish_reason ?? 'stop',
        },
      ],
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
    }
  }

  formatStreamChunk(_ctx: Context, chunk: string) {
    return {
      id: `chatcmpl-${_ctx.requestId}`,
      object: 'chat.completion.chunk',
      created: Date.now(),
      model: _ctx.input.model,
      choices: [
        {
          index: 0,
          delta: { content: chunk },
          finish_reason: null,
        },
      ],
    }
  }

  getContentType() {
    return 'application/json'
  }

  getStreamChunkType() {
    return 'sse' as const
  }
}