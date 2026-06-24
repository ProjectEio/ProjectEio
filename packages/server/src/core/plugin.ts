import type { PluginDefinition, WebUIRegistration } from './types.ts'

export class PluginRegistry {
  private plugins = new Map<string, PluginDefinition>()

  register(plugin: PluginDefinition): void {
    if (this.plugins.has(plugin.name)) {
      throw new Error(`Plugin "${plugin.name}" already registered`)
    }
    this.plugins.set(plugin.name, plugin)
    plugin.onLoad?.()
    console.log(`[Plugin] Loaded: ${plugin.name} v${plugin.version}`)
  }

  get(name: string): PluginDefinition | undefined {
    return this.plugins.get(name)
  }

  getAll(): PluginDefinition[] {
    return Array.from(this.plugins.values())
  }

  getWebUIRoutes(): WebUIRegistration[] {
    return this.getAll()
      .filter((p) => p.webui)
      .map((p) => p.webui!)
  }

  getHandler(pluginName: string, handlerName: string) {
    const plugin = this.get(pluginName)
    if (!plugin) throw new Error(`Plugin "${pluginName}" not found`)
    const handler = plugin.handlers[handlerName]
    if (!handler) throw new Error(`Handler "${handlerName}" not found in plugin "${pluginName}"`)
    return handler
  }
}

export const pluginRegistry = new PluginRegistry()