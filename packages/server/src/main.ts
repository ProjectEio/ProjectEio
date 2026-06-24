import { Hono } from 'hono'
import { streamSSE } from 'hono/streaming'
import { cors } from 'hono/cors'
import { serveStatic } from '@hono/node-server/serve-static'
import { readFileSync, existsSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { pluginRegistry } from './core/plugin'
import { Router } from './core/router'
import { echoPlugin } from './plugins/echo'
import { transformerPlugin } from './plugins/transformer'
import { llmProxyPlugin } from './plugins/llm-proxy'
// Built-in plugins from @project-eio/plugins
import {
  createStickyNodePlugin,
  createNetworkProxyPlugin,
  createModelRewritePlugin,
  createRes2XxxPlugin,
} from '@project-eio/plugins'
import { OpenAIFormat } from './formats/openai'
import { AnthropicFormat } from './formats/anthropic'
import { RESFormat } from './formats/res'
import { createMockServer } from './mock/server'
import { initStore, store } from './core/store'
import { createAdminApi } from './api/admin'
import { startHealthMonitor } from './services/health'
import { log } from './services/logger'
import { PLUGINS_ROOT, SERVER_ROOT } from './core/runtime'
import type { Context, RequestInput } from './core/types'

// ============================================================
// Main orchestrator
// ============================================================

// --- 1. Load plugins ---
pluginRegistry.register(echoPlugin)
pluginRegistry.register(transformerPlugin)
pluginRegistry.register(llmProxyPlugin)
pluginRegistry.register(createStickyNodePlugin())
pluginRegistry.register(createNetworkProxyPlugin())
pluginRegistry.register(createModelRewritePlugin())
pluginRegistry.register(createRes2XxxPlugin())

// --- 2. Initialize store (loads or seeds defaults) ---
initStore()

// --- 3. Setup router from store ---
const router = new Router()
router.registerFormat(new OpenAIFormat())
router.registerFormat(new AnthropicFormat())
router.registerFormat(new RESFormat())
router.setNodes(store.nodes.getAll())
router.setRules(store.routes.getAll())

// --- 4. Create main app ---
export function createApp() {
  const app = new Hono()

  app.use('*', cors())

  // --- Unified API entry ---
  app.post('/api/v1/chat/completions', async (c) => {
    const body = (await c.req.json()) as Record<string, unknown>
    return handleRequest(c, body, 'openai')
  })

  app.post('/api/v1/messages', async (c) => {
    const body = (await c.req.json()) as Record<string, unknown>
    return handleRequest(c, body, 'anthropic')
  })

  app.post('/api/v1/res', async (c) => {
    const body = (await c.req.json()) as Record<string, unknown>
    return handleRequest(c, body, 'res')
  })

  // --- Admin API ---
  app.route('/api/admin', createAdminApi(router, pluginRegistry, testRoute))

  // --- Plugin static webui ---
  mountPluginWebUI(app)

  // --- Mount mock server at /mock ---
  const mockApp = createMockServer()
  app.route('/mock', mockApp)

  // --- Start health monitor ---
  startHealthMonitor(router, store)

  log.info('main', 'Application ready')
  return app
}

// --- Request handler ---
async function handleRequest(c: any, body: Record<string, unknown>, formatName: string) {
  const fmt = router.getFormat(formatName)
  if (!fmt) return c.json({ error: `Unsupported format: ${formatName}` }, 400)

  const input = fmt.parseRequest(body)
  const resolved = router.resolve(input)

  if (!resolved) return c.json({ error: 'No matching route or node' }, 404)

  const ctx: Context = {
    requestId: crypto.randomUUID().slice(0, 8),
    input,
    output: null,
    metadata: { nodeId: resolved.node.id, nodeName: resolved.node.name, format: formatName },
    errors: [],
  }

  const finalCtx = await router.executeChain(ctx, resolved.chain)

  if (finalCtx.errors.length > 0) {
    return c.json({ error: finalCtx.errors.map((e) => e.message) }, 502)
  }

  if (input.stream) {
    const content = finalCtx.output?.content ?? ''
    const words = content.split(' ')

    return streamSSE(c, async (s) => {
      for (let i = 0; i < words.length; i++) {
        const chunk = fmt.formatStreamChunk(finalCtx, words[i]! + ' ')
        await s.writeSSE({ data: JSON.stringify(chunk) })
        await s.sleep(30)
      }
      if (fmt.getStreamChunkType() === 'sse') {
        await s.writeSSE({ data: '[DONE]' })
      }
    })
  }

  return c.json(fmt.formatResponse(finalCtx))
}

// --- Plugin webui static mounting ---
function mountPluginWebUI(app: Hono): void {
  for (const p of pluginRegistry.getAll()) {
    const webui = p.webui
    if (!webui || !webui.iframe) continue

    const distDir = join(PLUGINS_ROOT, 'dist-webui', p.name)
    const devDir = join(PLUGINS_ROOT, 'src', 'webui', p.name)
    const customDir = webui.staticDir ? resolve(PLUGINS_ROOT, webui.staticDir) : undefined

    const candidate = (customDir && existsSync(customDir)) ? customDir
      : existsSync(distDir) ? distDir
      : existsSync(devDir) ? devDir
      : null

    if (!candidate) {
      log.warn('webui', `No static dir for plugin "${p.name}"`, { distDir, devDir })
      continue
    }

    // serveStatic requires a path relative to cwd. We compute it from SERVER_ROOT (process cwd).
    const cwd = process.cwd()
    const relRoot = relative(cwd, candidate).split('\\').join('/')

    app.get(`/plugins/${p.name}/webui/*`, serveStatic({
      root: relRoot || '.',
      rewriteRequestPath: (path) => path.replace(new RegExp(`^/plugins/${p.name}/webui`), ''),
    }))

    // Fallback handler if serveStatic didn't match (e.g. index)
    app.get(`/plugins/${p.name}/webui`, (c) => {
      const indexFile = join(candidate, 'index.html')
      if (existsSync(indexFile)) {
        const content = readFileSync(indexFile, 'utf8')
        return c.html(content)
      }
      return c.text('Not found', 404)
    })

    log.info('webui', `mounted plugin webui /plugins/${p.name}/webui -> ${candidate}`)
  }
  void SERVER_ROOT
}

// --- Standalone test helper ---
export async function testRoute(model: string, message = 'Hello', formatName = 'openai') {
  const input: RequestInput = {
    model,
    messages: [{ role: 'user', content: message }],
  }
  const resolved = router.resolve(input)
  if (!resolved) return { error: 'No route for model', model }

  const ctx: Context = {
    requestId: 'test',
    input,
    output: null,
    metadata: {},
    errors: [],
  }

  const finalCtx = await router.executeChain(ctx, resolved.chain)
  const fmt = router.getFormat(formatName)

  return {
    route: resolved.node.name,
    node: resolved.node.id,
    chain: resolved.chain,
    output: finalCtx.output,
    response: fmt ? fmt.formatResponse(finalCtx) : null,
  }
}
