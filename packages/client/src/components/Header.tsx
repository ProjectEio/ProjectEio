import { Link } from 'react-router-dom'
import { Container } from './Container'
import styles from './Header.module.css'

export function Header() {
  return (
    <header className={styles.header}>
      <Container className={styles.inner}>
        <Link to="/" className={styles.logo}>
          <span className={styles.logoMark}>◆</span>
          <span className={styles.logoText}>Eio</span>
        </Link>
        <nav className={styles.nav}>
          <a href="#architecture">架构</a>
          <a href="#components">组件</a>
          <a href="#stack">技术栈</a>
          <a
            href="https://github.com/"
            target="_blank"
            rel="noreferrer"
            className={styles.navGithub}
          >
            GitHub ↗
          </a>
        </nav>
      </Container>
    </header>
  )
}
