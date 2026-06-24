/** 仅前端 mock 使用的数据类型（与后端最终契约可能略不同）。 */

export type NodeStatus = 'available' | 'recovering' | 'disabled'

export interface UpstreamNode {
  id: string
  name: string
  type: 'openai' | 'anthropic' | 'azure' | 'custom'
  status: NodeStatus
  latencyMs: number | null
  lastProbedAt: string | null
  failCount: number
  url: string
}

export interface DashboardSummary {
  availableCount: number
  recoveringCount: number
  disabledCount: number
  qps: number
  qpsTrend: number /* -1 / 0 / 1 */
}

export interface AuthUser {
  id: string
  username: string
  displayName: string
  role: 'admin' | 'operator'
}
