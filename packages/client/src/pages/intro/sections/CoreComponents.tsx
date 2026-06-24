import { Container } from '@/components/Container'
import styles from './CoreComponents.module.css'

const components = [
  {
    icon: '⟨/⟩',
    title: '路由矩阵',
    subtitle: '规则引擎',
    desc: '用户 × 模型 × Key池 × 节点 四维匹配，支持批量映射、指定映射、通配符与粘性策略。',
    code: `routes:
  - match: { user: "premium-*", model: "gpt-4" }
    target:
      modelMap: "gpt-4-0125"
      keyPool: ["batch-01", "batch-02"]
      sticky: { key: "user", ttl: 3600 }`,
  },
  {
    icon: '⚙',
    title: '插件系统',
    subtitle: '动态 TS 插件',
    desc: '一个函数即一个插件。import() + chokidar 热加载，崩溃在工作进程内隔离。',
    code: `// plugin.ts
export default function(
  ctx: RouteContext,
  nodes: Node[]
): Node {
  return nodes[0]
}`,
  },
  {
    icon: '◐',
    title: '状态管理',
    subtitle: '每实例独立内存',
    desc: '可用 / 恢复 / 禁用三个池，本地 Map 维护，无 Redis、无 Etcd、无共享。',
    code: `class StateManager {
  availablePool: Map<string, Node[]>
  recoveryPool: Map<string, Set<Node>>
  disabledPool: Set<string>
  stickyMappings: Map<string, Sticky>
}`,
  },
  {
    icon: '◉',
    title: '探测引擎',
    subtitle: '30s 并发心跳',
    desc: '并发探测所有节点；超时入恢复池；连续失败 5 次禁用 5h；恢复 3 次回归。',
    code: `// every 30s
await Promise.all(
  nodes.map(probe)
)
// fail x5 → disabled 5h
// recover x3 → available`,
  },
]

export function CoreComponents() {
  return (
    <section id="components" className={styles.section}>
      <Container>
        <div className={styles.header}>
          <span className={styles.eyebrow}>核心组件</span>
          <h2 className={styles.title}>四块拼图，串起整个网关</h2>
          <p className={styles.desc}>
            每一块都做一件小事，组合起来既能扛量，又能灵活演化。
          </p>
        </div>

        <div className={styles.grid}>
          {components.map((c) => (
            <article key={c.title} className={styles.card}>
              <header className={styles.cardHead}>
                <span className={styles.cardIcon}>{c.icon}</span>
                <div>
                  <h3 className={styles.cardTitle}>{c.title}</h3>
                  <span className={styles.cardSub}>{c.subtitle}</span>
                </div>
              </header>
              <p className={styles.cardDesc}>{c.desc}</p>
              <pre className={styles.code}>
                <code>{c.code}</code>
              </pre>
            </article>
          ))}
        </div>
      </Container>
    </section>
  )
}
