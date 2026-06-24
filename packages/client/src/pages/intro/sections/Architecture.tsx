import { Container } from '@/components/Container'
import styles from './Architecture.module.css'

const layers = [
  {
    no: '01',
    name: 'Layer 1 · New-API 上游',
    summary: '一致性哈希 · 流量分发 · 实例健康检查',
    points: [
      '用户ID / sessionID 哈希',
      '固定路由到同一实例',
      '上游统一接管流量',
    ],
    accent: 'cyan',
  },
  {
    no: '02',
    name: 'Layer 2 · 路由实例（无状态集群）',
    summary: '管理进程 + 多工作进程，本地内存状态，互不依赖',
    points: [
      'WebUI / 插件管理 / 子进程编排',
      'HTTP + 插件引擎 + 规则引擎',
      '节点池 · 恢复池 · 禁用池',
    ],
    accent: 'purple',
  },
  {
    no: '03',
    name: 'Layer 3 · 后端节点（数千）',
    summary: 'OpenAI / Anthropic / Azure / 自建 / 第三方',
    points: [
      '由各实例独立探测维护',
      '30s 并发探测心跳',
      '连续失败 5 次 → 禁用 5h',
    ],
    accent: 'green',
  },
] as const

export function Architecture() {
  return (
    <section id="architecture" className={styles.section}>
      <Container>
        <div className={styles.header}>
          <span className={styles.eyebrow}>架构</span>
          <h2 className={styles.title}>三层 · 各司其职</h2>
          <p className={styles.desc}>
            上游用一致性哈希做分流，中间层由无状态实例集群处理路由，
            下游是被独立探测的数千个后端节点。每一层都尽可能简单、可水平扩展。
          </p>
        </div>

        <ol className={styles.layers}>
          {layers.map((l) => (
            <li
              key={l.no}
              className={styles.layer}
              data-accent={l.accent}
            >
              <div className={styles.layerHead}>
                <span className={styles.layerNo}>{l.no}</span>
                <h3 className={styles.layerName}>{l.name}</h3>
              </div>
              <p className={styles.layerSummary}>{l.summary}</p>
              <ul className={styles.layerPoints}>
                {l.points.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </li>
          ))}
        </ol>

        <div className={styles.flowNote}>
          <span>请求</span>
          <span className={styles.arrow}>→</span>
          <span>Layer 1 哈希分流</span>
          <span className={styles.arrow}>→</span>
          <span>Layer 2 规则匹配 + 插件选节点</span>
          <span className={styles.arrow}>→</span>
          <span>Layer 3 后端</span>
        </div>
      </Container>
    </section>
  )
}
