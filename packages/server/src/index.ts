import { serve } from '@hono/node-server'
import { Hono } from 'hono'

const app = new Hono()
const PORT = process.env['PORT'] ?? 3001

app.get('/api/health', (c) => c.json({ status: 'ok' }))

serve(
  { fetch: app.fetch, port: Number(PORT) },
  (info) => console.log(`Server running on http://localhost:${info.port}`),
)