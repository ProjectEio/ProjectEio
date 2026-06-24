import type { UpstreamNode, AuthUser } from '@/types/api'

/** mock 数据：登录态 + 节点池。 */

export const mockUser: AuthUser = {
  id: 'u_001',
  username: 'admin',
  displayName: '管理员',
  role: 'admin',
}

const TYPES: UpstreamNode['type'][] = [
  'openai',
  'anthropic',
  'azure',
  'custom',
]

function rand<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!
}

function makeNode(i: number): UpstreamNode {
  const r = (i * 9301 + 49297) % 233280
  const seed = r / 233280
  let status: UpstreamNode['status']
  if (seed > 0.85) status = 'disabled'
  else if (seed > 0.7) status = 'recovering'
  else status = 'available'

  return {
    id: `n_${String(i).padStart(4, '0')}`,
    name: `node-${i}`,
    type: rand(TYPES),
    status,
    latencyMs:
      status === 'available' ? Math.round(20 + seed * 380) : null,
    lastProbedAt:
      status === 'disabled'
        ? null
        : new Date(Date.now() - Math.floor(seed * 60_000)).toISOString(),
    failCount: status === 'disabled' ? 5 : Math.floor(seed * 4),
    url: `https://api.example.com/n${i}`,
  }
}

export const nodes: UpstreamNode[] = Array.from({ length: 24 }, (_, i) =>
  makeNode(i + 1),
)

export function recountSummary() {
  const available = nodes.filter((n) => n.status === 'available').length
  const recovering = nodes.filter((n) => n.status === 'recovering').length
  const disabled = nodes.filter((n) => n.status === 'disabled').length
  return {
    availableCount: available,
    recoveringCount: recovering,
    disabledCount: disabled,
    qps: 320 + Math.floor(Math.random() * 80),
    qpsTrend: Math.random() > 0.5 ? 1 : -1,
  }
}
