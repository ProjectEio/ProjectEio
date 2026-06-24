import { Container } from './Container'
import styles from './Footer.module.css'

export function Footer() {
  return (
    <footer className={styles.footer}>
      <Container className={styles.inner}>
        <span>© {new Date().getFullYear()} Eio — Routing Gateway</span>
        <span className={styles.tagline}>
          用自由对抗复杂 · Node.js + TypeScript
        </span>
      </Container>
    </footer>
  )
}
