import { Hono } from 'hono'
import { streamSSE } from 'hono/streaming'
import { cors } from 'hono/cors'
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
import type { Context, NodeConfig, RouteRule, RequestInput } from './core/types'

// ============================================================
// Main orchestrator — plugin registration, routing, admin API
// ============================================================

// --- 1. Load plugins ---
pluginRegistry.register(echoPlugin)
pluginRegistry.register(transformerPlugin)
pluginRegistry.register(llmProxyPlugin)
pluginRegistry.register(createStickyNodePlugin())
pluginRegistry.register(createNetworkProxyPlugin())
pluginRegistry.register(createModelRewritePlugin())
pluginRegistry.register(createRes2XxxPlugin())

// --- 2. Setup router ---
const router = new Router()
router.registerFormat(new OpenAIFormat())
router.registerFormat(new AnthropicFormat())
router.registerFormat(new RESFormat())

// --- 3. Configure nodes ---
const nodes: NodeConfig[] = [
  { id: 'mock-oa-1', name: 'Mock OpenAI US', type: 'openai', baseUrl: 'http://localhost:3099', apiKey: 'sk-mock', models: ['gpt-4', 'gpt-3.5-turbo'], status: 'active' },
  { id: 'mock-oa-2', name: 'Mock OpenAI EU', type: 'openai', baseUrl: 'http://localhost:3099', apiKey: 'sk-mock', models: ['gpt-4', 'gpt-3.5-turbo'], status: 'active' },
  { id: 'mock-ant-1', name: 'Mock Anthropic US', type: 'anthropic', baseUrl: 'http://localhost:3099', apiKey: 'sk-mock', models: ['claude-3-opus', 'claude-3-sonnet'], status: 'active' },
  { id: 'mock-ant-2', name: 'Mock Anthropic EU', type: 'anthropic', baseUrl: 'http://localhost:3099', apiKey: 'sk-mock', models: ['claude-3-sonnet'], status: 'active' },
  { id: 'mock-res-1', name: 'Mock RES Default', type: 'res', baseUrl: 'http://localhost:3099', apiKey: 'sk-mock', models: ['res-model-v1'], status: 'active' },
]
router.setNodes(nodes)

// --- 4. Configure routes ---
const rules: RouteRule[] = [
  { id: 'r1', name: 'GPT-4 → OpenAI US (sticky)', priority: 100, match: { model: 'gpt-4' }, nodeId: 'mock-oa-1', pluginChain: ['sticky-node.route', 'transformer.log', 'transformer.cap_messages.{"count":10}', 'echo.echo'] },
  { id: 'r2', name: 'GPT-3.5 → OpenAI EU (fallback)', priority: 50, match: { model: 'gpt-3.5-turbo' }, nodeId: 'mock-oa-2', pluginChain: ['transformer.log', 'echo.echo'] },
  { id: 'r3', name: 'Claude → Anthropic US', priority: 100, match: { model: 'claude-3-opus' }, nodeId: 'mock-ant-1', pluginChain: ['transformer.log', 'echo.echo'] },
  { id: 'r4', name: 'Claude Sonnet → Anthropic EU', priority: 80, match: { model: 'claude-3-sonnet' }, nodeId: 'mock-ant-2', pluginChain: ['transformer.log', 'echo.echo'] },
  { id: 'r5', name: 'RES model → RES node', priority: 100, match: { model: 'res-model' }, nodeId: 'mock-res-1', pluginChain: ['res2xxx.convert.{"target":"openai"}', 'echo.echo'] },
  { id: 'r99', name: 'Catch-all → OpenAI US', priority: 1, match: {}, nodeId: 'mock-oa-1', pluginChain: ['echo.echo'] },
]
router.setRules(rules)

// --- 5. Create main app ---
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
  app.get('/api/admin/plugins', (c) => {
    return c.json({
      plugins: pluginRegistry.getAll().map((p) => ({
        name: p.name,
        version: p.version,
        description: p.description,
        handlers: Object.keys(p.handlers),
        webui: p.webui ?? null,
      })),
    })
  })

  app.get('/api/admin/nodes', (c) => c.json({ nodes: router.getAllNodes() }))
  app.get('/api/admin/routes', (c) => c.json({ rules: router.getAllRules() }))
  app.get('/api/admin/webui', (c) => c.json({ webui: pluginRegistry.getWebUIRoutes() }))

  // --- Mount mock server at /mock ---
  const mockApp = createMockServer()
  app.route('/mock', mockApp)

  return app
}

// --- Request handler: routing + plugin chain + format output ---
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

  // Execute plugin chain
  const finalCtx = await router.executeChain(ctx, resolved.chain)

  if (finalCtx.errors.length > 0) {
    return c.json({ error: finalCtx.errors.map((e) => e.message) }, 502)
  }

  // Handle streaming
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