import { Container } from '@/components/Container'
import styles from './Hero.module.css'

export function Hero() {
  return (
    <section className={styles.hero}>
      <div className={styles.bgGrid} aria-hidden />
      <div className={styles.bgGlow} aria-hidden />
      <Container className={styles.inner}>
        <span className={styles.badge}>
          <span className={styles.badgeDot} />
          v0.1 · Routing Gateway
        </span>
        <h1 className={styles.title}>
          用<span className={styles.titleAccent}>自由</span>
          对抗<span className={styles.titleAccent}>复杂</span>
          <br />
          的多节点路由网关
        </h1>
        <p className={styles.subtitle}>
          Node.js + TypeScript · 插件式架构 · 无状态水平扩展
          <br />
          一致性哈希路由 · 动态 TS 插件热加载 · 千节点并发探测
        </p>
        <div className={styles.actions}>
          <a className={styles.btnPrimary} href="#architecture">
            查看架构
          </a>
          <a className={styles.btnGhost} href="#components">
            核心组件
          </a>
        </div>
        <ul className={styles.stats}>
          <li>
            <strong>3</strong>
            <span>层架构</span>
          </li>
          <li>
            <strong>4</strong>
            <span>核心组件</span>
          </li>
          <li>
            <strong>1000+</strong>
            <span>节点并发探测</span>
          </li>
          <li>
            <strong>0</strong>
            <span>共享状态依赖</span>
          </li>
        </ul>
      </Container>
    </section>
  )
}
