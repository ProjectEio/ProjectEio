import { useEffect, useState } from 'react'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { Input } from '@/components/Input'
import { Spinner } from '@/components/Spinner'
import { Table, type Column } from '@/components/Table'
import { http } from '@/lib/http'
import type {
  DashboardSummary,
  NodeStatus,
  UpstreamNode,
} from '@/types/api'
import styles from './DashboardPage.module.css'

const STATUSES: { value: NodeStatus | ''; label: string }[] = [
  { value: '', label: '全部' },
  { value: 'available', label: '可用' },
  { value: 'recovering', label: '恢复中' },
  { value: 'disabled', label: '已禁用' },
]

function statusBadge(s: NodeStatus) {
  if (s === 'available') return <Badge tone="success" dot>可用</Badge>
  if (s === 'recovering') return <Badge tone="warning" dot>恢复中</Badge>
  return <Badge tone="error" dot>已禁用</Badge>
}

function formatTime(iso: string | null) {
  if (!iso) return '—'
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return `${Math.floor(diff)}s 前`
  if (diff < 3600) return `${Math.floor(diff / 60)}m 前`
  return new Date(iso).toLocaleString()
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [nodes, setNodes] = useState<UpstreamNode[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<NodeStatus | ''>('')
  const [keyword, setKeyword] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter) params.set('status', statusFilter)
      if (keyword.trim()) params.set('q', keyword.trim())
      const [s, n] = await Promise.all([
        http.get<DashboardSummary>('/api/dashboard/summary'),
        http.get<{ items: UpstreamNode[] }>(
          `/api/nodes${params.toString() ? `?${params}` : ''}`,
        ),
      ])
      setSummary(s)
      setNodes(n.items)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter])

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault()
    void load()
  }

  const onDisable = async (id: string) => {
    await http.post(`/api/nodes/${id}/disable`)
    void load()
  }
  const onEnable = async (id: string) => {
    await http.post(`/api/nodes/${id}/enable`)
    void load()
  }

  const columns: Column<UpstreamNode>[] = [
    { key: 'name', title: '名称', dataIndex: 'name', width: 140 },
    {
      key: 'type',
      title: '类型',
      width: 110,
      render: (n) => (
        <span className={styles.type}>{n.type}</span>
      ),
    },
    {
      key: 'status',
      title: '状态',
      width: 110,
      render: (n) => statusBadge(n.status),
    },
    {
      key: 'latency',
      title: '延迟',
      width: 100,
      align: 'right',
      render: (n) =>
        n.latencyMs == null ? (
          <span className={styles.dim}>—</span>
        ) : (
          <span className={styles.metric}>{n.latencyMs}ms</span>
        ),
    },
    {
      key: 'lastProbedAt',
      title: '最近探测',
      width: 140,
      render: (n) => (
        <span className={styles.dim}>{formatTime(n.lastProbedAt)}</span>
      ),
    },
    {
      key: 'failCount',
      title: '失败次数',
      width: 100,
      align: 'right',
      render: (n) => <span className={styles.metric}>{n.failCount}</span>,
    },
    {
      key: 'url',
      title: 'URL',
      render: (n) => <span className={styles.url}>{n.url}</span>,
    },
    {
      key: 'op',
      title: '操作',
      width: 130,
      align: 'right',
      render: (n) =>
        n.status === 'disabled' ? (
          <Button size="sm" onClick={() => void onEnable(n.id)}>
            启用
          </Button>
        ) : (
          <Button
            size="sm"
            variant="danger"
            onClick={() => void onDisable(n.id)}
          >
            禁用
          </Button>
        ),
    },
  ]

  return (
    <div className={styles.page}>
      {/* 查询区 */}
      <form className={styles.filter} onSubmit={onSearch}>
        <div className={styles.tabs}>
          {STATUSES.map((s) => (
            <button
              type="button"
              key={s.label}
              className={
                statusFilter === s.value ? styles.tabActive : styles.tab
              }
              onClick={() => setStatusFilter(s.value)}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className={styles.search}>
          <Input
            placeholder="按名称 / 类型 搜索"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
          <Button type="submit" variant="primary">
            查询
          </Button>
        </div>
      </form>

      {/* 统计卡 */}
      <div className={styles.stats}>
        <StatCard
          tone="success"
          label="可用节点"
          value={summary?.availableCount}
          hint="probe 通过"
        />
        <StatCard
          tone="warning"
          label="恢复中"
          value={summary?.recoveringCount}
          hint="待回归"
        />
        <StatCard
          tone="error"
          label="已禁用"
          value={summary?.disabledCount}
          hint="5 次失败"
        />
        <StatCard
          tone="primary"
          label="实时 QPS"
          value={summary?.qps}
          hint={
            summary?.qpsTrend == null
              ? ''
              : summary.qpsTrend > 0
                ? '↑ 上升趋势'
                : '↓ 下降趋势'
          }
        />
      </div>

      {/* 节点表 */}
      <Card
        padding="none"
        title={`节点列表 · ${nodes.length} 项`}
        extra={
          loading ? <Spinner size={14} tip="同步中" /> : null
        }
      >
        <Table<UpstreamNode>
          rowKey="id"
          columns={columns}
          data={nodes}
          loading={loading}
        />
      </Card>
    </div>
  )
}

interface StatProps {
  tone: 'success' | 'warning' | 'error' | 'primary'
  label: string
  value: number | undefined
  hint?: string
}
function StatCard({ tone, label, value, hint }: StatProps) {
  return (
    <Card padding="md" className={`${styles.stat} ${styles[`tone-${tone}`]}`}>
      <div className={styles.statLabel}>{label}</div>
      <div className={styles.statValue}>
        {value == null ? '—' : value.toLocaleString()}
      </div>
      {hint && <div className={styles.statHint}>{hint}</div>}
    </Card>
  )
}
