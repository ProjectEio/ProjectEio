import type { Context, RequestInput, RouteRule, NodeConfig, FormatAdapter } from './types'
import { pluginRegistry } from './plugin'

export class Router {
  private rules: RouteRule[] = []
  private nodes = new Map<string, NodeConfig>()
  private formats = new Map<string, FormatAdapter>()

  setNodes(nodes: NodeConfig[]): void {
    this.nodes.clear()
    for (const n of nodes) this.nodes.set(n.id, n)
  }

  setRules(rules: RouteRule[]): void {
    this.rules = rules.sort((a, b) => b.priority - a.priority)
  }

  addRule(rule: RouteRule): void {
    this.rules.push(rule)
    this.rules.sort((a, b) => b.priority - a.priority)
  }

  registerFormat(fmt: FormatAdapter): void {
    this.formats.set(fmt.name, fmt)
  }

  getFormat(name: string): FormatAdapter | undefined {
    return this.formats.get(name)
  }

  getNode(id: string): NodeConfig | undefined {
    return this.nodes.get(id)
  }

  getAllNodes(): NodeConfig[] {
    return Array.from(this.nodes.values())
  }

  getAllRules(): RouteRule[] {
    return this.rules
  }

  resolve(input: RequestInput): { node: NodeConfig; chain: string[] } | null {
    for (const rule of this.rules) {
      if (this.matchRule(rule.match, input)) {
        const node = this.nodes.get(rule.nodeId)
        if (node && node.status === 'active') {
          return { node, chain: rule.pluginChain ?? [] }
        }
      }
    }
    return null
  }

  async executeChain(ctx: Context, chain: string[]): Promise<Context> {
    let current = ctx
    for (const step of chain) {
      const parts = step.split('.')
      let pluginName: string
      let handlerName: string
      let params: unknown = undefined

      if (parts.length === 2) {
        pluginName = parts[0]!
        handlerName = parts[1]!
      } else if (parts.length >= 3) {
        pluginName = parts[0]!
        handlerName = parts[1]!
        try { params = JSON.parse(parts.slice(2).join('.')) } catch { params = parts.slice(2).join('.') }
      } else {
        pluginName = parts[0]!
        handlerName = 'default'
      }

      const handler = pluginRegistry.getHandler(pluginName, handlerName)
      current = await handler.execute(current, params)
    }
    return current
  }

  private matchRule(match: RouteRule['match'], input: RequestInput): boolean {
    if (match.model) {
      const models = Array.isArray(match.model) ? match.model : [match.model]
      if (!models.some((m) => input.model?.startsWith(m))) return false
    }
    return true
  }
}