import { serve } from '@hono/node-server'
import { createApp, testRoute } from './main'

const PORT = Number(process.env['PORT']) || 3001

const app = createApp()

serve(
  { fetch: app.fetch, port: PORT },
  (info) => {
    console.log(`\n🚀 Main server running on http://localhost:${info.port}`)
    console.log(`📡 Mock server mounted at http://localhost:${info.port}/mock`)
    console.log(`📋 Admin API:`)
    console.log(`   GET /api/admin/plugins`)
    console.log(`   GET /api/admin/nodes`)
    console.log(`   GET /api/admin/routes`)
    console.log(`   GET /api/admin/webui`)
    console.log(`\n🔗 Entry endpoints:`)
    console.log(`   POST /api/v1/chat/completions  (OpenAI format)`)
    console.log(`   POST /api/v1/messages          (Anthropic format)`)
    console.log(`   POST /api/v1/res               (RES format)`)
    console.log(`\n🎯 Mock endpoints:`)
    console.log(`   POST /mock/v1/chat/completions  (OpenAI streaming)`)
    console.log(`   POST /mock/v1/messages          (Anthropic streaming)`)
    console.log(`   POST /mock/v1/res               (RES streaming)`)
    console.log(`   POST /mock/node/:nodeId/chat    (Node-specific test)`)
    console.log(`   GET  /mock/nodes                (List mock nodes)`)

    // Run integration test
    console.log(`\n--- Integration test ---`)
    testRoute('gpt-4', 'Hello, what is AI?').then((r) => {
      console.log(`  [gpt-4] -> ${r.route}: ${r.output?.content?.slice(0, 60)}...`)
    })
    testRoute('claude-3-sonnet', 'Hello, what is AI?').then((r) => {
      console.log(`  [claude-3-sonnet] -> ${r.route}: ${r.output?.content?.slice(0, 60)}...`)
    })
    testRoute('res-model-v1', 'Hello').then((r) => {
      console.log(`  [res-model-v1] -> ${r.route}: ${r.output?.content?.slice(0, 60)}...`)
    })
    console.log(``)
  },
)