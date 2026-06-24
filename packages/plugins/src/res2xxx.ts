// ============================================================
// RES2XXX Plugin — rewrite RES format responses to other formats
// ============================================================

import type { PluginDefinition } from './types'

type TargetFormat = 'openai' | 'anthropic' | 'raw'

/**
 * RES-to-XXX rewrite plugin:
 * Converts responses from RES (custom) format to
 * OpenAI / Anthropic / any other format.
 * Useful when backend nodes return RES but client expects standard format.
 */
export function createRes2XxxPlugin(): PluginDefinition {
  return {
    name: 'res2xxx',
    version: '1.0.0',
    description:
      'RES 格式重写 — 将 RES 响应转换为 OpenAI / Anthropic / 其他格式',
    handlers: {
      /** Convert RES output to target format */
      convert: {
        meta: {
          description: 'convert RES response to openai|anthropic|raw',
          input: { target: '"openai"|"anthropic"|"raw"' },
        },
        execute: async (ctx, params) => {
          const { target } = (params ?? {}) as { target?: TargetFormat }
          const output = ctx['output'] as Record<string, unknown> ?? {}
          const content = String(output['content'] ?? '')
          const model = String(
            ((ctx['input'] as Record<string, unknown>)?.['model']) ?? 'unknown',
          )
          const reqId = String(ctx['requestId'] ?? '')

          switch (target) {
            case 'openai':
              ctx['output'] = {
                content,
                _format: 'openai',
                _wrapped: {
                  id: `chatcmpl-${reqId}`,
                  object: 'chat.completion',
                  model,
                  choices: [
                    {
                      index: 0,
                      message: { role: 'assistant', content },
                      finish_reason: 'stop',
                    },
                  ],
                },
              } as any
              break

            case 'anthropic':
              ctx['output'] = {
                content,
                _format: 'anthropic',
                _wrapped: {
                  id: `msg_${reqId}`,
                  type: 'message',
                  role: 'assistant',
                  content: [{ type: 'text', text: content }],
                  model,
                  stop_reason: 'end_turn',
                },
              } as any
              break

            case 'raw':
            default:
              // Keep as-is
              break
          }

          ctx['metadata'] = {
            ...(ctx['metadata'] as object),
            res2xxxTarget: target ?? 'raw',
          }

          return ctx
        },
      },
    },
    webui: {
      route: '/webui/res2xxx',
      label: 'RES Converter',
      icon: 'swap',
      config: {
        targets: ['openai', 'anthropic', 'raw'],
        description: 'RES 响应格式转换（RES → OpenAI / Anthropic）',
      },
    },
  }
}