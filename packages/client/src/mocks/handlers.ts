import { http, HttpResponse, delay } from 'msw'
import { mockUser, nodes, recountSummary } from './db'

const TOKEN = 'mock-token-eio-2026'

const requireAuth = (req: Request) => {
  const auth = req.headers.get('Authorization') || ''
  return auth === `Bearer ${TOKEN}`
}

export const handlers = [
  // ——— Auth ———
  http.post('/api/auth/login', async ({ request }) => {
    await delay(400)
    const body = (await request.json()) as {
      username?: string
      password?: string
    }
    if (body.username === 'admin' && body.password === 'admin123') {
      return HttpResponse.json({ token: TOKEN, user: mockUser })
    }
    return HttpResponse.json(
      { message: '账号或密码错误' },
      { status: 401 },
    )
  }),

  http.get('/api/auth/me', ({ request }) => {
    if (!requireAuth(request)) {
      return HttpResponse.json({ message: '未登录' }, { status: 401 })
    }
    return HttpResponse.json({ user: mockUser })
  }),

  http.post('/api/auth/logout', () =>
    HttpResponse.json({ ok: true }),
  ),

  // ——— Dashboard ———
  http.get('/api/dashboard/summary', async ({ request }) => {
    if (!requireAuth(request)) {
      return HttpResponse.json({ message: '未登录' }, { status: 401 })
    }
    await delay(250)
    return HttpResponse.json(recountSummary())
  }),

  http.get('/api/nodes', async ({ request }) => {
    if (!requireAuth(request)) {
      return HttpResponse.json({ message: '未登录' }, { status: 401 })
    }
    await delay(300)
    const url = new URL(request.url)
    const status = url.searchParams.get('status')
    const keyword = url.searchParams.get('q')?.toLowerCase() ?? ''
    let list = nodes
    if (status) list = list.filter((n) => n.status === status)
    if (keyword) {
      list = list.filter(
        (n) =>
          n.name.toLowerCase().includes(keyword) ||
          n.type.toLowerCase().includes(keyword),
      )
    }
    return HttpResponse.json({ items: list, total: list.length })
  }),

  http.post('/api/nodes/:id/disable', async ({ request, params }) => {
    if (!requireAuth(request)) {
      return HttpResponse.json({ message: '未登录' }, { status: 401 })
    }
    const id = String(params['id'])
    const target = nodes.find((n) => n.id === id)
    if (!target) {
      return HttpResponse.json({ message: 'not found' }, { status: 404 })
    }
    target.status = 'disabled'
    target.latencyMs = null
    target.failCount = 5
    return HttpResponse.json({ ok: true, node: target })
  }),

  http.post('/api/nodes/:id/enable', async ({ request, params }) => {
    if (!requireAuth(request)) {
      return HttpResponse.json({ message: '未登录' }, { status: 401 })
    }
    const id = String(params['id'])
    const target = nodes.find((n) => n.id === id)
    if (!target) {
      return HttpResponse.json({ message: 'not found' }, { status: 404 })
    }
    target.status = 'available'
    target.failCount = 0
    target.latencyMs = 80 + Math.floor(Math.random() * 120)
    target.lastProbedAt = new Date().toISOString()
    return HttpResponse.json({ ok: true, node: target })
  }),
]
