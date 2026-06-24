import { Container } from '@/components/Container'
import styles from './CallToAction.module.css'

export function CallToAction() {
  return (
    <section className={styles.section}>
      <Container>
        <div className={styles.card}>
          <div className={styles.copy}>
            <h2 className={styles.title}>准备好驯服你的几千个节点了吗？</h2>
            <p className={styles.desc}>
              控制台正在路上 —— 节点池、插件管理、规则编辑器、实时日志。
            </p>
          </div>
          <div className={styles.actions}>
            <a className={styles.btnPrimary} href="#architecture">
              查看完整架构
            </a>
            <a
              className={styles.btnGhost}
              href="https://github.com/"
              target="_blank"
              rel="noreferrer"
            >
              查看源码 ↗
            </a>
          </div>
        </div>
      </Container>
    </section>
  )
}
