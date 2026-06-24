import { Container } from '@/components/Container'
import styles from './ProblemSolutions.module.css'

const rows = [
  ['几千个节点怎么管', '并发探测 + 状态机（可用 / 恢复 / 禁用）'],
  ['流量大了怎么办', 'New-API 哈希分流到多个独立实例'],
  ['插件挂了怎么办', '工作进程隔离 + 管理进程自动重启'],
  ['怎么动态加载插件', 'import() + chokidar 文件热加载'],
  ['用户怎么路由', '规则引擎：批量 / 指定 / 通配符映射'],
  ['Key 怎么管理', '粘性 Key 池 + 一致性哈希'],
  ['节点怎么恢复', '恢复池 + 自动探测 + 连续成功 3 次回归'],
  ['多机怎么协调', '不协调 — 上游哈希保证同一用户到同一实例'],
] as const

export function ProblemSolutions() {
  return (
    <section className={styles.section}>
      <Container>
        <div className={styles.header}>
          <span className={styles.eyebrow}>它解决了什么</span>
          <h2 className={styles.title}>问题 → 解法</h2>
        </div>
        <div className={styles.table} role="table">
          {rows.map(([q, a]) => (
            <div className={styles.row} role="row" key={q}>
              <div className={styles.q} role="cell">
                {q}
              </div>
              <div className={styles.arrow} aria-hidden>
                →
              </div>
              <div className={styles.a} role="cell">
                {a}
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  )
}
