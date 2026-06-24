// === Core message & request types ===

export interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string | ContentBlock[]
  name?: string
  tool_call_id?: string
}

export type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'image'; source: { type: string; media_type: string; data: string } }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
  | { type: 'tool_result'; tool_use_id: string; content: string }

export interface RequestInput {
  model: string
  messages: Message[]
  stream?: boolean
  max_tokens?: number
  temperature?: number
  top_p?: number
  stop?: string | string[]
  [key: string]: unknown
}

export interface Context {
  requestId: string
  input: RequestInput
  output: { content: string; finish_reason?: string } | null
  metadata: Record<string, unknown>
  errors: Error[]
  [key: string]: unknown
}

// === Node configuration ===

export type NodeType = 'openai' | 'anthropic' | 'res'

export interface NodeConfig {
  id: string
  name: string
  type: NodeType
  baseUrl: string
  apiKey: string
  models: string[]
  weight?: number
  status: 'active' | 'inactive'
  tags?: string[]
  delay?: number
}

// === Route rules ===

export interface RouteMatch {
  model?: string | string[]
  type?: NodeType | NodeType[]
  tag?: string | string[]
}

export interface RouteRule {
  id: string
  name: string
  priority: number
  match: RouteMatch
  nodeId: string
  pluginChain?: string[]
}

// === Plugin system ===

export interface HandlerMeta {
  description: string
  input?: Record<string, unknown>
  output?: Record<string, unknown>
}

export interface PluginHandler {
  meta: HandlerMeta
  execute: (ctx: Context, params?: unknown) => Promise<Context>
}

export interface WebUIRegistration {
  route: string
  label: string
  icon?: string
  config?: Record<string, unknown>
}

export interface PluginDefinition {
  name: string
  version: string
  description: string
  handlers: Record<string, PluginHandler>
  webui?: WebUIRegistration
  onLoad?: () => void | Promise<void>
}

// === Format adapter ===

export interface FormatAdapter {
  name: string
  parseRequest(body: Record<string, unknown>, headers?: Record<string, string>): RequestInput
  formatResponse(ctx: Context): unknown
  formatStreamChunk(ctx: Context, chunk: string): unknown
  getContentType(): string
  getStreamChunkType(): 'sse' | 'jsonl'
}