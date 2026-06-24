// ============================================================
// Network Proxy Plugin — global / strategy / node-level proxy
// ============================================================

import type { PluginDefinition } from './types'

interface ProxyConfig {
  enabled: boolean
  protocol: 'http' | 'https' | 'socks5'
  host: string
  port: number
  auth?: { username: string; password: string }
}

type ProxyLevel = 'global' | 'strategy' | 'node' | 'model'

/**
 * Network proxy plugin with three-tier configuration:
 * 1. Global — applies to all traffic
 * 2. Strategy — applies to a group of nodes
 * 3. Node/Model — applies to specific nodes or models
 */
export function createNetworkProxyPlugin(): PluginDefinition {
  const proxies = new Map<ProxyLevel, Map<string, ProxyConfig>>()

  function getEffectiveProxy(nodeId?: string): ProxyConfig | null {
    // Priority: model > node > strategy > global
    if (nodeId) {
      const nodeProxy = proxies.get('node')?.get(nodeId)
      if (nodeProxy?.enabled) return nodeProxy
    }
    const globalProxy = proxies.get('global')?.get('__global__')
    if (globalProxy?.enabled) return globalProxy
    return null
  }

  function proxyUrl(config: ProxyConfig): string {
    const auth = config.auth
      ? `${config.auth.username}:${config.auth.password}@`
      : ''
    return `${config.protocol}://${auth}${config.host}:${config.port}`
  }

  return {
    name: 'network-proxy',
    version: '1.0.0',
    description:
      '网络代理 — 支持全局/策略组/节点级三层代理配置',
    handlers: {
      /** Set a proxy at a given level */
      set: {
        meta: {
          description: 'configure proxy at global|strategy|node|model level',
          input: {
            level: '"global"|"strategy"|"node"|"model"',
            key: 'string',
            config: 'ProxyConfig',
          },
        },
        execute: async (ctx, params) => {
          const { level, key, config } = (params ?? {}) as {
            level?: ProxyLevel
            key?: string
            config?: ProxyConfig
          }
          if (level && config) {
            if (!proxies.has(level)) proxies.set(level, new Map())
            proxies.get(level)!.set(key ?? '__default__', config)
          }
          return ctx
        },
      },
      /** Resolve effective proxy for current context */
      resolve: {
        meta: { description: 'resolve the effective proxy for this request' },
        execute: async (ctx) => {
          const meta = ctx['metadata'] as Record<string, unknown> ?? {}
          const nodeId = meta['nodeId'] as string | undefined
          const proxy = getEffectiveProxy(nodeId)
          if (proxy) {
            ctx['metadata'] = { ...meta, proxyUrl: proxyUrl(proxy) }
          }
          return ctx
        },
      },
      /** Get proxy URL as a fetch-compatible string */
      getProxyUrl: {
        meta: { description: 'return the proxy URL for external HTTP calls' },
        execute: async (ctx) => {
          const meta = ctx['metadata'] as Record<string, unknown> ?? {}
          const existing = meta['proxyUrl']
          if (existing) {
            ctx['output'] = { content: String(existing) }
          }
          return ctx
        },
      },
    },
    webui: {
      route: '/webui/network-proxy',
      label: 'Network Proxy',
      icon: 'globe',
      iframe: true,
      config: {
        levels: ['global', 'strategy', 'node', 'model'],
        description: '三层代理配置（全局 → 策略组 → 节点/模型）',
      },
    },
  }
}