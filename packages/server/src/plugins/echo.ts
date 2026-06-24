import type { Context } from '../core/types'
import type { PluginDefinition } from '../core/types'

export const echoPlugin: PluginDefinition = {
  name: 'echo',
  version: '1.0.0',
  description: 'Echo the last user message as output',
  handlers: {
    echo: {
      meta: { description: 'Returns the last user message content' },
      execute: async (ctx: Context) => {
        const lastMsg = ctx.input.messages.at(-1)
        ctx.output = {
          content: typeof lastMsg?.content === 'string'
            ? lastMsg.content
            : JSON.stringify(lastMsg?.content),
        }
        return ctx
      },
    },
  },
  webui: {
    route: '/webui/echo',
    label: 'Echo Tester',
    config: { description: 'Simple echo test tool' },
  },
}