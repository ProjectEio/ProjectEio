// ============================================================
// Plugin type definitions for @project-eio/plugins
// Compatible with server/src/core/types PluginDefinition
// Note: uses `any` for cross-package type compatibility
// ============================================================

export interface PluginDefinition {
  name: string
  version: string
  description: string
  handlers: Record<string, PluginHandler>
  webui?: WebUIRegistration
  onLoad?: () => void | Promise<void>
}

export interface PluginHandler {
  meta: HandlerMeta
  execute: (ctx: any, params?: any) => Promise<any>
}

export interface HandlerMeta {
  description: string
  input?: Record<string, any>
  output?: Record<string, any>
}

export interface WebUIRegistration {
  route: string
  label: string
  icon?: string
  config?: Record<string, any>
}