import type { Context, Message } from '../core/types'
import type { PluginDefinition } from '../core/types'

export const transformerPlugin: PluginDefinition = {
  name: 'transformer',
  version: '1.0.0',
  description: 'Transform request messages (prepend system prompt, filter, truncate)',
  handlers: {
    prepend_system: {
      meta: {
        description: 'Prepend a system message',
        input: { prompt: 'string' },
      },
      execute: async (ctx: Context, params?: unknown) => {
        const { prompt } = (params ?? {}) as { prompt?: string }
        if (prompt) {
          ctx.input.messages.unshift({ role: 'system', content: prompt })
        }
        return ctx
      },
    },
    cap_messages: {
      meta: {
        description: 'Keep only the last N messages',
        input: { count: 'number' },
      },
      execute: async (ctx: Context, params?: unknown) => {
        const { count } = (params ?? {}) as { count?: number }
        if (count && count > 0 && ctx.input.messages.length > count) {
          ctx.input.messages = ctx.input.messages.slice(-count) as [Message, ...Message[]]
        }
        return ctx
      },
    },
    log: {
      meta: { description: 'Log the current context state' },
      execute: async (ctx: Context) => {
        console.log(`[log] requestId=${ctx.requestId} model=${ctx.input.model} messages=${ctx.input.messages.length}`)
        return ctx
      },
    },
  },
  webui: {
    route: '/webui/transformer',
    label: 'Transformer Config',
    config: {
      fields: [
        { name: 'prompt', type: 'text', label: 'System Prompt' },
        { name: 'count', type: 'number', label: 'Max Messages' },
      ],
    },
  },
}