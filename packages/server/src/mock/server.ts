import { Hono } from 'hono'
import { streamSSE } from 'hono/streaming'
import { OpenAIFormat } from '../formats/openai'
import { AnthropicFormat } from '../formats/anthropic'
import { RESFormat } from '../formats/res'

// ============================================================
// Mock Server — Multi-endpoint mock for routing tests
// Supports OpenAI, Anthropic & RES formats, streaming & non-streaming
// ============================================================

type MockNodeConfig = {
  id: string
  name: string
  type: 'openai' | 'anthropic' | 'res'
  models: string[]
  delay: number
  errorRate: number
}

const MOCK_NODES: MockNodeConfig[] = [
  { id: 'mock-oa-1', name: 'Mock OpenAI US', type: 'openai', models: ['gpt-4', 'gpt-3.5-turbo'], delay: 200, errorRate: 0 },
  { id: 'mock-oa-2', name: 'Mock OpenAI EU', type: 'openai', models: ['gpt-4', 'gpt-3.5-turbo'], delay: 400, errorRate: 0.05 },
  { id: 'mock-ant-1', name: 'Mock Anthropic US', type: 'anthropic', models: ['claude-3-opus', 'claude-3-sonnet'], delay: 300, errorRate: 0 },
  { id: 'mock-ant-2', name: 'Mock Anthropic EU', type: 'anthropic', models: ['claude-3-sonnet'], delay: 500, errorRate: 0.1 },
  { id: 'mock-res-1', name: 'Mock RES Default', type: 'res', models: ['res-model-v1'], delay: 100, errorRate: 0 },
]

const openaiFmt = new OpenAIFormat()
const anthropicFmt = new AnthropicFormat()
const resFmt = new RESFormat()

function pickModel(type: string): string {
  const nodes = MOCK_NODES.filter((n) => n.type === type)
  const node = nodes[Math.floor(Math.random() * nodes.length)]
  const models = node?.models ?? ['unknown']
  return models[Math.floor(Math.random() * models.length)] ?? 'unknown'
}

function generateContent(messages: unknown[]): string {
  const last = messages?.at(-1) as any
  const prompt = typeof last?.content === 'string' ? last.content.slice(0, 50) : 'hello'
  return `Mock response for: "${prompt}". This simulates a streaming LLM response for testing purposes.`
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

export function createMockServer() {
  const app = new Hono()

  // --- OpenAI-compatible endpoint ---
  app.post('/v1/chat/completions', async (c) => {
    const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>
    const stream = (body["stream"] as boolean) ?? false
    const delay = Number(c.req.header('X-Mock-Delay')) || 200
    const errorRate = Number(c.req.header('X-Mock-Error-Rate')) || 0
    const reqId = crypto.randomUUID().slice(0, 8)

    // Simulate error
    if (Math.random() < errorRate) {
      return c.json({ error: { message: 'Mock server error', type: 'mock_error' } }, 503)
    }

    await sleep(delay)

    if (stream) {
      const content = generateContent((body["messages"] as any[]) ?? [])
      const words = content.split(' ')

      return streamSSE(c, async (s) => {
        for (let i = 0; i < words.length; i++) {
          const chunk = openaiFmt.formatStreamChunk(
            { requestId: reqId, input: body as any, output: null, metadata: {}, errors: [] },
            words[i]! + ' ',
          )
          await s.writeSSE({ data: JSON.stringify(chunk) })
          await s.sleep(30)
        }
        await s.writeSSE({ data: '[DONE]' })
      })
    }

    return c.json({
      id: `chatcmpl-${reqId}`,
      object: 'chat.completion',
      created: Date.now(),
      model: body["model"] ?? pickModel('openai'),
      choices: [{ index: 0, message: { role: 'assistant', content: generateContent((body["messages"] as any[]) ?? []) }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
    })
  })

  // --- Anthropic-compatible endpoint ---
  app.post('/v1/messages', async (c) => {
    const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>
    const stream = (body["stream"] as boolean) ?? false
    const delay = Number(c.req.header('X-Mock-Delay')) || 300
    const reqId = crypto.randomUUID().slice(0, 8)

    await sleep(delay)

    if (stream) {
      const content = generateContent((body["messages"] as any[]) ?? [])
      const words = content.split(' ')

      return streamSSE(c, async (s) => {
        await s.writeSSE({ event: 'message_start', data: JSON.stringify({ type: 'message_start', message: { id: `msg_${reqId}` } }) })
        for (let i = 0; i < words.length; i++) {
          const chunk = anthropicFmt.formatStreamChunk(
            { requestId: reqId, input: body as any, output: null, metadata: {}, errors: [] },
            words[i]! + ' ',
          )
          await s.writeSSE({ event: 'content_block_delta', data: JSON.stringify(chunk) })
          await s.sleep(40)
        }
        await s.writeSSE({ event: 'message_stop', data: '{}' })
      })
    }

    return c.json({
      id: `msg_${reqId}`,
      type: 'message',
      role: 'assistant',
      content: [{ type: 'text', text: generateContent((body["messages"] as any[]) ?? []) }],
      model: body["model"] ?? pickModel('anthropic'),
      stop_reason: 'end_turn',
      usage: { input_tokens: 10, output_tokens: 20 },
    })
  })

  // --- RES-format endpoint ---
  app.post('/v1/res', async (c) => {
    const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>
    const stream = (body["stream"] as boolean) ?? false
    const delay = Number(c.req.header('X-Mock-Delay')) || 100
    const reqId = crypto.randomUUID().slice(0, 8)

    await sleep(delay)

    if (stream) {
      const content = generateContent((body["messages"] as any[]) ?? [])
      const words = content.split(' ')

      // RES streaming uses SSE-based approach
      return streamSSE(c, async (s) => {
        for (let i = 0; i < words.length; i++) {
          const chunk = resFmt.formatStreamChunk(
            { requestId: reqId, input: body as any, output: null, metadata: {}, errors: [] },
            words[i]! + ' ',
          )
          await s.writeSSE({ data: JSON.stringify(chunk) })
          await s.sleep(20)
        }
        await s.writeSSE({ data: JSON.stringify({ success: true, done: true }) })
      })
    }

    return c.json({
      success: true,
      request_id: reqId,
      data: {
        model: body["model"] ?? pickModel('res'),
        output: generateContent((body["messages"] as any[]) ?? []),
        usage: { prompt_tokens: 10, completion_tokens: 20 },
      },
    })
  })

  // --- Utility endpoint: list mock nodes ---
  app.get('/nodes', (c) => c.json({ nodes: MOCK_NODES }))

  // --- Node-specific test endpoint ---
  app.post('/node/:nodeId/chat', async (c) => {
    const nodeId = c.req.param('nodeId')
    const node = MOCK_NODES.find((n) => n.id === nodeId)
    if (!node) return c.json({ error: 'node not found' }, 404)

    const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>
    await sleep(node.delay)

    return c.json({
      node: node.id,
      type: node.type,
      model: body["model"] ?? node.models[0],
      output: `[${node.name}] Mock response for model ${body["model"] ?? node.models[0]}`,
    })
  })

  return app
}