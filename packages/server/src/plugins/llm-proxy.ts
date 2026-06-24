import type { Context } from '../core/types'
import type { PluginDefinition } from '../core/types'
import { OpenAIFormat } from '../formats/openai'
import { AnthropicFormat } from '../formats/anthropic'
import { RESFormat } from '../formats/res'

const formats = {
  openai: new OpenAIFormat(),
  anthropic: new AnthropicFormat(),
  res: new RESFormat(),
}

export const llmProxyPlugin: PluginDefinition = {
  name: 'llm-proxy',
  version: '1.0.0',
  description: 'Proxy requests to external LLM endpoints with format conversion',
  handlers: {
    proxy: {
      meta: {
        description: 'Forward request to a target LLM endpoint and return the response',
        input: { baseUrl: 'string', apiKey: 'string', targetFormat: '"openai"|"anthropic"|"res"' },
      },
      execute: async (ctx: Context, params?: unknown) => {
        const { baseUrl, apiKey, targetFormat } = (params ?? {}) as {
          baseUrl?: string
          apiKey?: string
          targetFormat?: 'openai' | 'anthropic' | 'res'
        }

        const fmt = targetFormat ?? 'openai'
        const adapter = formats[fmt]
        const url = baseUrl ?? 'http://localhost:3099'
        const key = apiKey ?? 'sk-mock'

        // Convert internal context to target format
        const body = adapter.formatResponse(ctx)

        try {
          const endpoint = fmt === 'openai'
            ? '/v1/chat/completions'
            : fmt === 'anthropic'
              ? '/v1/messages'
              : '/v1/res'

          const res = await fetch(`${url}${endpoint}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${key}`,
              ...(ctx.input.stream ? { 'Accept': 'text/event-stream' } : {}),
            },
            body: JSON.stringify({
              ...body,
              model: ctx.input.model,
              messages: ctx.input.messages,
              stream: ctx.input.stream,
              max_tokens: ctx.input.max_tokens,
              temperature: ctx.input.temperature,
            }),
          })

          if (!res.ok) {
            ctx.errors.push(new Error(`LLM proxy error: ${res.status} ${await res.text()}`))
            return ctx
          }

          if (ctx.input.stream) {
            // For streaming, we set output to signal streaming mode
            ctx.output = { content: '[stream]' }
            ctx.metadata['streamResponse'] = res.body
          } else {
            const data = (await res.json()) as any
            ctx.output = {
              content: extractContent(data, fmt),
            }
          }
        } catch (err) {
          ctx.errors.push(err instanceof Error ? err : new Error(String(err)))
        }

        return ctx
      },
    },
  },
}

function extractContent(data: any, fmt: string): string {
  if (fmt === 'openai') {
    return data?.choices?.[0]?.message?.content ?? JSON.stringify(data)
  }
  if (fmt === 'anthropic') {
    return data?.content?.[0]?.text ?? JSON.stringify(data)
  }
  return data?.data?.output ?? JSON.stringify(data)
}