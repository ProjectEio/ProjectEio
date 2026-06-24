import { Container } from '@/components/Container'
import styles from './TechStack.module.css'

const groups = [
  {
    label: 'Runtime',
    items: ['Node.js', 'TypeScript'],
  },
  {
    label: 'HTTP',
    items: ['Fastify', 'Hono'],
  },
  {
    label: '进程 & 热加载',
    items: ['child_process.fork()', 'chokidar', 'import()'],
  },
  {
    label: '配置 & 校验',
    items: ['YAML', 'Zod'],
  },
  {
    label: '探测 & 并发',
    items: ['Promise.all()', '内存 Map'],
  },
  {
    label: '多机',
    items: ['New-API 一致性哈希', 'LB'],
  },
]

export function TechStack() {
  return (
    <section id="stack" className={styles.section}>
      <Container>
        <div className={styles.header}>
          <span className={styles.eyebrow}>技术栈</span>
          <h2 className={styles.title}>最少的东西，最稳的组合</h2>
        </div>
        <div className={styles.grid}>
          {groups.map((g) => (
            <div className={styles.group} key={g.label}>
              <div className={styles.groupLabel}>{g.label}</div>
              <div className={styles.tags}>
                {g.items.map((it) => (
                  <span key={it} className={styles.tag}>
                    {it}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  )
}
