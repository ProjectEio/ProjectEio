import type { PropsWithChildren } from 'react'
import styles from './Badge.module.css'

type Tone = 'default' | 'success' | 'warning' | 'error' | 'primary'

interface Props {
  tone?: Tone
  dot?: boolean
}

export function Badge({
  tone = 'default',
  dot = false,
  children,
}: PropsWithChildren<Props>) {
  return (
    <span className={[styles.badge, styles[`t-${tone}`]].join(' ')}>
      {dot && <span className={styles.dot} aria-hidden />}
      {children}
    </span>
  )
}
