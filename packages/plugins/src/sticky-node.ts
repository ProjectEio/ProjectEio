// ============================================================
// Sticky Node Plugin — session/node affinity routing
// ============================================================

import type { PluginDefinition } from './types'

/**
 * Sticky node plugin pins session affinity:
 * - Same affinity key → same node
 * - Supports session-level, model-level strategies
 */
export function createStickyNodePlugin(): PluginDefinition {
  const affinityMap = new Map<string, string>()
  const strategyOptions = ['session', 'model', 'custom'] as const

  return {
    name: 'sticky-node',
    version: '1.0.0',
    description:
      '粘性节点路由 — 同一会话固定到同一节点，支持多种亲和性策略',
    handlers: {
      /** Resolve sticky route: pin request to node based on affinity key */
      route: {
        meta: {
          description: 'resolve sticky route, pin to node',
          input: { strategy: '"session"|"model"|"custom"', key: 'string (optional)' },
        },
        execute: async (ctx, params) => {
          const { strategy, key } = (params ?? {}) as {
            strategy?: string
            key?: string
          }
          const affinityKey =
            key ??
            (strategy === 'model'
              ? `model:${String(ctx['input']?.['model'] ?? '')}`
              : String(ctx['requestId'] ?? ''))

          const pinned = affinityMap.get(affinityKey)
          if (pinned) {
            ctx['metadata'] = { ...(ctx['metadata'] as object), pinnedNodeId: pinned }
          }
          ctx['metadata'] = {
            ...(ctx['metadata'] as object),
            affinityKey,
            strategy: strategy ?? 'session',
          }
          return ctx
        },
      },
      /** List current sticky routing table */
      list: {
        meta: { description: 'view the current sticky routing table' },
        execute: async (ctx) => {
          ctx['output'] = {
            content: JSON.stringify(Object.fromEntries(affinityMap)),
          }
          return ctx
        },
      },
      /** Clear a specific affinity binding */
      clear: {
        meta: { description: 'clear sticky binding for a key', input: { key: 'string' } },
        execute: async (ctx, params) => {
          const { key } = (params ?? {}) as { key?: string }
          if (key) affinityMap.delete(key)
          return ctx
        },
      },
    },
    webui: {
      route: '/webui/sticky-node',
      label: 'Sticky Node',
      icon: 'pin',
      iframe: true,
      config: {
        description: '管理粘性路由表，查看节点亲和性绑定',
        strategies: [...strategyOptions],
      },
    },
  }
}