// Admin REST API
import { Hono } from 'hono'
import type { Router } from '../core/router'
import type { PluginRegistry } from '../core/plugin'
import { store } from '../core/store'
import { runHealthCheck } from '../services/health'
import { runCapabilityTest } from '../services/capability'
import { getConfig, PROJECT_ROOT, SERVER_ROOT, PLUGINS_ROOT, DATA_DIR, LOG_DIR, CONFIG_DIR, VERSION, VERSION_NAME } from '../core/runtime'
import type {
  Context,
  NodeConfig,
  RouteRule,
  NodeGroup,
  ModelTag,
  LogEntry,
} from '../core/types'

type TestRouteFn = (model: string, message?: string, format?: string) => Promise<unknown>

function syncRouter(router: Router): void {
  router.setNodes(store.nodes.getAll())
  router.setRules(store.routes.getAll())
}

export function createAdminApi(
  router: Router,
  registry: PluginRegistry,
  testRoute?: TestRouteFn,
): Hono {
  const app = new Hono()

  // ---- Plugins ----
  app.get('/plugins', (c) => {
    const plugins = registry.getAll().map((p) => ({
      name: p.name,
      version: p.version,
      description: p.description,
      handlers: Object.keys(p.handlers).map((h) => ({ name: h, meta: p.handlers[h]?.meta })),
      webui: p.webui ?? null,
      enabled: store.pluginState.get(p.name),
    }))
    return c.json({ plugins })
  })

  app.get('/plugins/:name', (c) => {
    const name = c.req.param('name')
    const p = registry.get(name)
    if (!p) return c.json({ error: 'Plugin not found' }, 404)
    return c.json({
      name: p.name,
      version: p.version,
      description: p.description,
      handlers: Object.entries(p.handlers).map(([k, h]) => ({ name: k, meta: h.meta })),
      webui: p.webui ?? null,
      enabled: store.pluginState.get(p.name),
    })
  })

  app.post('/plugins/:name/enabled', async (c) => {
    const name = c.req.param('name')
    const p = registry.get(name)
    if (!p) return c.json({ error: 'Plugin not found' }, 404)
    const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>
    const enabled = Boolean(body["enabled"])
    store.pluginState.set(name, enabled)
    return c.json({ name, enabled })
  })

  app.post('/plugins/:name/invoke', async (c) => {
    const name = c.req.param('name')
    const p = registry.get(name)
    if (!p) return c.json({ error: 'Plugin not found' }, 404)
    const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>
    const handlerName = String(body["handler"] ?? 'default')
    const params = body["params"]
    const incoming = (body["ctx"] as Partial<Context>) ?? {}
    const ctx: Context = {
      requestId: crypto.randomUUID().slice(0, 8),
      input: incoming.input ?? { model: 'invoke', messages: [] },
      output: incoming.output ?? null,
      metadata: incoming.metadata ?? {},
      errors: [],
    }
    try {
      const handler = registry.getHandler(name, handlerName)
      const out = await handler.execute(ctx, params)
      return c.json({ ctx: out })
    } catch (e: unknown) {
      return c.json({ error: e instanceof Error ? e.message : String(e) }, 500)
    }
  })

  // ---- Nodes ----
  app.get('/nodes', (c) => c.json({ nodes: store.nodes.getAll() }))

  app.post('/nodes', async (c) => {
    const body = (await c.req.json()) as NodeConfig
    if (!body.id || !body.name || !body.type) {
      return c.json({ error: 'Missing required fields: id, name, type' }, 400)
    }
    const saved = store.nodes.upsert(body)
    syncRouter(router)
    return c.json({ node: saved })
  })

  app.delete('/nodes/:id', (c) => {
    const ok = store.nodes.remove(c.req.param('id'))
    syncRouter(router)
    return c.json({ removed: ok })
  })

  app.post('/nodes/bulk', async (c) => {
    const body = (await c.req.json()) as NodeConfig[]
    if (!Array.isArray(body)) return c.json({ error: 'Expected array' }, 400)
    const saved = store.nodes.bulkUpsert(body)
    syncRouter(router)
    return c.json({ nodes: saved })
  })

  // ---- Routes ----
  app.get('/routes', (c) => c.json({ rules: store.routes.getAll() }))

  app.post('/routes', async (c) => {
    const body = (await c.req.json()) as RouteRule
    if (!body.id || !body.nodeId) return c.json({ error: 'Missing id or nodeId' }, 400)
    const saved = store.routes.upsert(body)
    syncRouter(router)
    return c.json({ rule: saved })
  })

  app.delete('/routes/:id', (c) => {
    const ok = store.routes.remove(c.req.param('id'))
    syncRouter(router)
    return c.json({ removed: ok })
  })

  // ---- Groups ----
  app.get('/groups', (c) => c.json({ groups: store.groups.getAll() }))

  app.post('/groups', async (c) => {
    const body = (await c.req.json()) as NodeGroup
    if (!body.id || !body.name) return c.json({ error: 'Missing id or name' }, 400)
    const saved = store.groups.upsert(body)
    return c.json({ group: saved })
  })

  app.delete('/groups/:id', (c) => {
    const ok = store.groups.remove(c.req.param('id'))
    return c.json({ removed: ok })
  })

  // ---- Blacklist ----
  app.get('/blacklist', (c) => c.json({ entries: store.blacklist.getAll() }))

  app.post('/blacklist', async (c) => {
    const body = (await c.req.json()) as Record<string, unknown>
    if (!body["reason"]) return c.json({ error: 'Missing reason' }, 400)
    const entry = store.blacklist.add({
      reason: String(body["reason"]),
      ...(body["nodeId"] !== undefined ? { nodeId: String(body["nodeId"]) } : {}),
      ...(body["modelKey"] !== undefined ? { modelKey: String(body["modelKey"]) } : {}),
      ...(body["expiresAt"] !== undefined ? { expiresAt: Number(body["expiresAt"]) } : {}),
    })
    return c.json({ entry })
  })

  app.delete('/blacklist/:id', (c) => {
    const ok = store.blacklist.remove(c.req.param('id'))
    return c.json({ removed: ok })
  })

  // ---- Tags ----
  app.get('/tags', (c) => c.json({ tags: store.tags.getAll() }))

  app.post('/tags', async (c) => {
    const body = (await c.req.json()) as ModelTag
    if (!body.name || !body.type) return c.json({ error: 'Missing name or type' }, 400)
    const saved = store.tags.upsert(body)
    return c.json({ tag: saved })
  })

  app.delete('/tags/:name', (c) => {
    const ok = store.tags.remove(c.req.param('name'))
    return c.json({ removed: ok })
  })

  // ---- Health ----
  app.get('/health', (c) => c.json({ health: store.health.getAll() }))

  app.get('/health/:nodeId', (c) => {
    const rec = store.health.get(c.req.param('nodeId'))
    if (!rec) return c.json({ error: 'No health record' }, 404)
    return c.json({ health: rec })
  })

  app.post('/health/check/:nodeId', async (c) => {
    const id = c.req.param('nodeId')
    const node = store.nodes.get(id)
    if (!node) return c.json({ error: 'Node not found' }, 404)
    const rec = await runHealthCheck(node)
    store.health.upsert(rec)
    return c.json({ health: rec })
  })

  // ---- Capabilities ----
  app.get('/capabilities', (c) => c.json({ capabilities: store.capabilities.getAll() }))

  app.post('/capabilities/test', async (c) => {
    const body = (await c.req.json()) as Record<string, unknown>
    const nodeId = String(body["nodeId"] ?? '')
    const model = String(body["model"] ?? '')
    const suites = Array.isArray(body["suites"]) ? (body["suites"] as string[]) : undefined
    const node = store.nodes.get(nodeId)
    if (!node) return c.json({ error: 'Node not found' }, 404)
    const result = await runCapabilityTest(node, model, suites)
    store.capabilities.upsert(result)
    return c.json({ result })
  })

  // ---- Logs ----
  app.get('/logs', (c) => {
    const limitRaw = c.req.query('limit')
    const levelRaw = c.req.query('level') as LogEntry['level'] | undefined
    const limit = limitRaw ? Number(limitRaw) : 200
    const logs = store.logs.list(limit, levelRaw)
    return c.json({ logs })
  })

  app.delete('/logs', (c) => {
    store.logs.clear()
    return c.json({ cleared: true })
  })

  // ---- WebUI registrations ----
  app.get('/webui', (c) => {
    const out = registry.getAll()
      .filter((p) => p.webui)
      .map((p) => {
        const w = p.webui!
        const iframeUrl = w.iframe ? `/plugins/${p.name}/webui/index.html` : undefined
        return {
          pluginName: p.name,
          route: w.route,
          label: w.label,
          icon: w.icon ?? null,
          ...(iframeUrl ? { iframeUrl } : {}),
        }
      })
    return c.json({ webui: out })
  })

  // ---- Runtime info ----
  app.get('/runtime', (c) => {
    return c.json({
      version: VERSION,
      versionName: VERSION_NAME,
      config: getConfig(),
      paths: {
        projectRoot: PROJECT_ROOT,
        serverRoot: SERVER_ROOT,
        pluginsRoot: PLUGINS_ROOT,
        dataDir: DATA_DIR,
        logDir: LOG_DIR,
        configDir: CONFIG_DIR,
      },
    })
  })

  // ---- Test route helper ----
  app.post('/test-route', async (c) => {
    if (!testRoute) return c.json({ error: 'testRoute not wired' }, 500)
    const body = (await c.req.json()) as Record<string, unknown>
    const model = String(body["model"] ?? '')
    const message = body["message"] !== undefined ? String(body["message"]) : undefined
    const format = body["format"] !== undefined ? String(body["format"]) : undefined
    const result = await testRoute(model, message, format)
    return c.json({ result })
  })

  return app
}
