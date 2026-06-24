// In-memory store with JSON file persistence
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { DATA_DIR } from './runtime'
import type {
  NodeConfig,
  RouteRule,
  NodeGroup,
  NodeBlacklistEntry,
  ModelTag,
  HealthRecord,
  CapabilityTestResult,
  LogEntry,
} from './types'

const STORE_DIR = join(DATA_DIR, 'store')

function ensureDir(): void {
  try {
    if (!existsSync(STORE_DIR)) mkdirSync(STORE_DIR, { recursive: true })
  } catch (_e) {
    // ignore
  }
}

function loadJson<T>(file: string, fallback: T): T {
  try {
    const path = join(STORE_DIR, file)
    if (!existsSync(path)) return fallback
    const raw = readFileSync(path, 'utf8')
    return JSON.parse(raw) as T
  } catch (_e) {
    return fallback
  }
}

function saveJson<T>(file: string, data: T): void {
  try {
    ensureDir()
    writeFileSync(join(STORE_DIR, file), JSON.stringify(data, null, 2), 'utf8')
  } catch (_e) {
    // ignore
  }
}

// ---- Initial seed data (must mirror main.ts defaults) ----
const SEED_NODES: NodeConfig[] = [
  { id: 'mock-oa-1', name: 'Mock OpenAI US', type: 'openai', baseUrl: 'http://localhost:3099', apiKey: 'sk-mock', models: ['gpt-4', 'gpt-3.5-turbo'], status: 'active' },
  { id: 'mock-oa-2', name: 'Mock OpenAI EU', type: 'openai', baseUrl: 'http://localhost:3099', apiKey: 'sk-mock', models: ['gpt-4', 'gpt-3.5-turbo'], status: 'active' },
  { id: 'mock-ant-1', name: 'Mock Anthropic US', type: 'anthropic', baseUrl: 'http://localhost:3099', apiKey: 'sk-mock', models: ['claude-3-opus', 'claude-3-sonnet'], status: 'active' },
  { id: 'mock-ant-2', name: 'Mock Anthropic EU', type: 'anthropic', baseUrl: 'http://localhost:3099', apiKey: 'sk-mock', models: ['claude-3-sonnet'], status: 'active' },
  { id: 'mock-res-1', name: 'Mock RES Default', type: 'res', baseUrl: 'http://localhost:3099', apiKey: 'sk-mock', models: ['res-model-v1'], status: 'active' },
]

const SEED_ROUTES: RouteRule[] = [
  { id: 'r1', name: 'GPT-4 -> OpenAI US (sticky)', priority: 100, match: { model: 'gpt-4' }, nodeId: 'mock-oa-1', pluginChain: ['sticky-node.route', 'transformer.log', 'transformer.cap_messages.{"count":10}', 'echo.echo'] },
  { id: 'r2', name: 'GPT-3.5 -> OpenAI EU (fallback)', priority: 50, match: { model: 'gpt-3.5-turbo' }, nodeId: 'mock-oa-2', pluginChain: ['transformer.log', 'echo.echo'] },
  { id: 'r3', name: 'Claude -> Anthropic US', priority: 100, match: { model: 'claude-3-opus' }, nodeId: 'mock-ant-1', pluginChain: ['transformer.log', 'echo.echo'] },
  { id: 'r4', name: 'Claude Sonnet -> Anthropic EU', priority: 80, match: { model: 'claude-3-sonnet' }, nodeId: 'mock-ant-2', pluginChain: ['transformer.log', 'echo.echo'] },
  { id: 'r5', name: 'RES model -> RES node', priority: 100, match: { model: 'res-model' }, nodeId: 'mock-res-1', pluginChain: ['res2xxx.convert.{"target":"openai"}', 'echo.echo'] },
  { id: 'r99', name: 'Catch-all -> OpenAI US', priority: 1, match: {}, nodeId: 'mock-oa-1', pluginChain: ['echo.echo'] },
]

// ---- State ----
let nodesMap = new Map<string, NodeConfig>()
let routesMap = new Map<string, RouteRule>()
let groupsMap = new Map<string, NodeGroup>()
let blacklistMap = new Map<string, NodeBlacklistEntry>()
let tagsMap = new Map<string, ModelTag>()
let healthMap = new Map<string, HealthRecord>()
let capMap = new Map<string, CapabilityTestResult>()
let pluginStateMap = new Map<string, boolean>()
const logsBuf: LogEntry[] = []
let logCounter = 0

function capKey(nodeId: string, model: string): string {
  return `${nodeId}::${model}`
}

function persistNodes() { saveJson('nodes.json', Array.from(nodesMap.values())) }
function persistRoutes() { saveJson('routes.json', Array.from(routesMap.values())) }
function persistGroups() { saveJson('groups.json', Array.from(groupsMap.values())) }
function persistBlacklist() { saveJson('blacklist.json', Array.from(blacklistMap.values())) }
function persistTags() { saveJson('tags.json', Array.from(tagsMap.values())) }
function persistHealth() { saveJson('health.json', Array.from(healthMap.values())) }
function persistCaps() { saveJson('capabilities.json', Array.from(capMap.values())) }
function persistPluginState() { saveJson('plugin-state.json', Array.from(pluginStateMap.entries())) }
function persistLogs() { saveJson('logs.json', logsBuf.slice(-1000)) }

export const store = {
  nodes: {
    getAll(): NodeConfig[] { return Array.from(nodesMap.values()) },
    get(id: string): NodeConfig | undefined { return nodesMap.get(id) },
    upsert(node: NodeConfig): NodeConfig { nodesMap.set(node.id, node); persistNodes(); return node },
    remove(id: string): boolean { const ok = nodesMap.delete(id); if (ok) persistNodes(); return ok },
    bulkUpsert(list: NodeConfig[]): NodeConfig[] {
      for (const n of list) nodesMap.set(n.id, n)
      persistNodes()
      return list
    },
  },
  routes: {
    getAll(): RouteRule[] { return Array.from(routesMap.values()) },
    get(id: string): RouteRule | undefined { return routesMap.get(id) },
    upsert(rule: RouteRule): RouteRule { routesMap.set(rule.id, rule); persistRoutes(); return rule },
    remove(id: string): boolean { const ok = routesMap.delete(id); if (ok) persistRoutes(); return ok },
  },
  groups: {
    getAll(): NodeGroup[] { return Array.from(groupsMap.values()) },
    get(id: string): NodeGroup | undefined { return groupsMap.get(id) },
    upsert(g: NodeGroup): NodeGroup { groupsMap.set(g.id, g); persistGroups(); return g },
    remove(id: string): boolean { const ok = groupsMap.delete(id); if (ok) persistGroups(); return ok },
  },
  blacklist: {
    getAll(): NodeBlacklistEntry[] { return Array.from(blacklistMap.values()) },
    add(entry: Omit<NodeBlacklistEntry, 'id' | 'createdAt'> & { id?: string }): NodeBlacklistEntry {
      const id = entry.id ?? `bl-${Date.now()}-${Math.floor(Math.random() * 1000)}`
      const rec: NodeBlacklistEntry = {
        id,
        reason: entry.reason,
        createdAt: Date.now(),
        ...(entry.nodeId !== undefined ? { nodeId: entry.nodeId } : {}),
        ...(entry.modelKey !== undefined ? { modelKey: entry.modelKey } : {}),
        ...(entry.expiresAt !== undefined ? { expiresAt: entry.expiresAt } : {}),
      }
      blacklistMap.set(id, rec)
      persistBlacklist()
      return rec
    },
    remove(id: string): boolean { const ok = blacklistMap.delete(id); if (ok) persistBlacklist(); return ok },
    isBlocked(nodeId: string, model: string): boolean {
      const now = Date.now()
      for (const e of blacklistMap.values()) {
        if (e.expiresAt !== undefined && e.expiresAt < now) continue
        const nodeMatch = e.nodeId === undefined || e.nodeId === nodeId
        const modelMatch = e.modelKey === undefined || e.modelKey === model || model.startsWith(e.modelKey)
        if (nodeMatch && modelMatch) return true
      }
      return false
    },
  },
  tags: {
    getAll(): ModelTag[] { return Array.from(tagsMap.values()) },
    upsert(t: ModelTag): ModelTag { tagsMap.set(t.name, t); persistTags(); return t },
    remove(name: string): boolean { const ok = tagsMap.delete(name); if (ok) persistTags(); return ok },
  },
  health: {
    getAll(): HealthRecord[] { return Array.from(healthMap.values()) },
    get(nodeId: string): HealthRecord | undefined { return healthMap.get(nodeId) },
    upsert(rec: HealthRecord): HealthRecord { healthMap.set(rec.nodeId, rec); persistHealth(); return rec },
  },
  capabilities: {
    getAll(): CapabilityTestResult[] { return Array.from(capMap.values()) },
    get(nodeId: string, model: string): CapabilityTestResult | undefined { return capMap.get(capKey(nodeId, model)) },
    upsert(rec: CapabilityTestResult): CapabilityTestResult {
      capMap.set(capKey(rec.nodeId, rec.model), rec)
      persistCaps()
      return rec
    },
  },
  pluginState: {
    getAll(): Record<string, boolean> {
      const out: Record<string, boolean> = {}
      for (const [k, v] of pluginStateMap.entries()) out[k] = v
      return out
    },
    get(name: string): boolean { return pluginStateMap.get(name) ?? true },
    set(name: string, enabled: boolean): void { pluginStateMap.set(name, enabled); persistPluginState() },
  },
  logs: {
    append(entry: LogEntry): void {
      logsBuf.push(entry)
      if (logsBuf.length > 1000) logsBuf.splice(0, logsBuf.length - 1000)
      logCounter++
      if (logCounter % 50 === 0) persistLogs()
    },
    list(limit = 200, level?: LogEntry['level']): LogEntry[] {
      let arr = logsBuf
      if (level) arr = arr.filter((e) => e.level === level)
      return arr.slice(-limit)
    },
    clear(): void {
      logsBuf.length = 0
      persistLogs()
    },
  },
}

export function initStore(): void {
  ensureDir()

  const nodes = loadJson<NodeConfig[]>('nodes.json', [])
  const routes = loadJson<RouteRule[]>('routes.json', [])
  const groups = loadJson<NodeGroup[]>('groups.json', [])
  const blacklist = loadJson<NodeBlacklistEntry[]>('blacklist.json', [])
  const tags = loadJson<ModelTag[]>('tags.json', [])
  const health = loadJson<HealthRecord[]>('health.json', [])
  const caps = loadJson<CapabilityTestResult[]>('capabilities.json', [])
  const pstate = loadJson<Array<[string, boolean]>>('plugin-state.json', [])
  const logs = loadJson<LogEntry[]>('logs.json', [])

  nodesMap = new Map(nodes.map((n) => [n.id, n]))
  routesMap = new Map(routes.map((r) => [r.id, r]))
  groupsMap = new Map(groups.map((g) => [g.id, g]))
  blacklistMap = new Map(blacklist.map((b) => [b.id, b]))
  tagsMap = new Map(tags.map((t) => [t.name, t]))
  healthMap = new Map(health.map((h) => [h.nodeId, h]))
  capMap = new Map(caps.map((c) => [capKey(c.nodeId, c.model), c]))
  pluginStateMap = new Map(pstate)
  logsBuf.length = 0
  for (const l of logs) logsBuf.push(l)

  // Seed defaults if empty
  if (nodesMap.size === 0) {
    for (const n of SEED_NODES) nodesMap.set(n.id, n)
    persistNodes()
  }
  if (routesMap.size === 0) {
    for (const r of SEED_ROUTES) routesMap.set(r.id, r)
    persistRoutes()
  }
}
