import type { RequestInput, Context } from '../core/types'
import type { FormatAdapter } from '../core/format'

const DEFAULT_TEXT = 'Hello from ProjectEio! Mock res response.'

export class RESFormat implements FormatAdapter {
  name = 'res'

  parseRequest(body: Record<string, unknown>): RequestInput {
    return {
      model: (body["model"] ?? body["model_id"]) as string ?? 'unknown',
      messages: (body["messages"] ?? body["prompt"] ?? []) as any[],
      stream: (body["stream"] as boolean) ?? false,
      max_tokens: (body["max_tokens"] ?? body["maxTokens"]) as number ?? undefined,
      temperature: (body["temperature"] ?? body["temp"]) as number ?? undefined,
    }
  }

  formatResponse(ctx: Context) {
    return {
      success: true,
      request_id: ctx.requestId,
      data: {
        model: ctx.input.model,
        output: ctx.output?.content ?? DEFAULT_TEXT,
        usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      },
    }
  }

  formatStreamChunk(_ctx: Context, chunk: string) {
    return {
      success: true,
      request_id: _ctx.requestId,
      data: { content: chunk },
    }
  }

  getContentType() {
    return 'application/json'
  }

  getStreamChunkType() {
    return 'jsonl' as const
  }
}