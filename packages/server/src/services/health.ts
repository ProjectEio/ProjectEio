// Health monitor — periodic node probes
import type { NodeConfig, HealthRecord } from '../core/types'
import type { store as Store } from '../core/store'
import type { Router } from '../core/router'
import { log } from './logger'

function endpointFor(node: NodeConfig): string {
  const base = node.baseUrl.replace(/\/+$/, '')
  if (node.type === 'anthropic') return `${base}/v1/messages`
  if (node.type === 'res') return `${base}/v1/res`
  return `${base}/v1/chat/completions`
}

function pingBody(node: NodeConfig): Record<string, unknown> {
  const model = node.models[0] ?? 'ping'
  if (node.type === 'anthropic') {
    return { model, max_tokens: 1, messages: [{ role: 'user', content: 'ping' }] }
  }
  return { model, messages: [{ role: 'user', content: 'ping' }], max_tokens: 1 }
}

export async function runHealthCheck(node: NodeConfig): Promise<HealthRecord> {
  const url = endpointFor(node)
  const started = Date.now()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 3000)
  const prev = healthMemo.get(node.id)
  const fails = prev?.consecutiveFailures ?? 0

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(node.apiKey ? { authorization: `Bearer ${node.apiKey}` } : {}),
      },
      body: JSON.stringify(pingBody(node)),
      signal: controller.signal,
    })
    clearTimeout(timer)
    const latency = Date.now() - started
    if (res.ok) {
      const rec: HealthRecord = {
        nodeId: node.id,
        status: latency > 1500 ? 'degraded' : 'healthy',
        lastChecked: Date.now(),
        latencyMs: latency,
        consecutiveFailures: 0,
        message: `HTTP ${res.status}`,
      }
      healthMemo.set(node.id, rec)
      return rec
    }
    const rec: HealthRecord = {
      nodeId: node.id,
      status: 'degraded',
      lastChecked: Date.now(),
      latencyMs: latency,
      consecutiveFailures: fails + 1,
      message: `HTTP ${res.status}`,
    }
    healthMemo.set(node.id, rec)
    return rec
  } catch (e: unknown) {
    clearTimeout(timer)
    const msg = e instanceof Error ? e.message : String(e)
    const rec: HealthRecord = {
      nodeId: node.id,
      status: 'down',
      lastChecked: Date.now(),
      consecutiveFailures: fails + 1,
      message: msg,
    }
    healthMemo.set(node.id, rec)
    return rec
  }
}

const healthMemo = new Map<string, HealthRecord>()

let monitorTimer: ReturnType<typeof setInterval> | null = null

export function startHealthMonitor(
  router: Router,
  s: typeof Store,
  intervalMs = 30000,
): () => void {
  if (monitorTimer) clearInterval(monitorTimer)

  const tick = async () => {
    const nodes = s.nodes.getAll().filter((n) => n.status === 'active')
    for (const n of nodes) {
      try {
        const rec = await runHealthCheck(n)
        s.health.upsert(rec)
      } catch (e: unknown) {
        log.warn('health', `probe failed for ${n.id}`, e instanceof Error ? e.message : String(e))
      }
    }
    void router
  }

  // First run after a short delay so server is ready
  setTimeout(() => { void tick() }, 1500)
  monitorTimer = setInterval(() => { void tick() }, intervalMs)
  log.info('health', `monitor started (interval=${intervalMs}ms)`)
  return () => { if (monitorTimer) clearInterval(monitorTimer); monitorTimer = null }
}
