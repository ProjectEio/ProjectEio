import type {
  CSSProperties,
  HTMLAttributes,
  PropsWithChildren,
  ReactNode,
} from 'react'
import styles from './Card.module.css'

interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: ReactNode
  extra?: ReactNode
  bordered?: boolean
  padding?: 'sm' | 'md' | 'lg' | 'none'
  bodyStyle?: CSSProperties
}

export function Card({
  title,
  extra,
  bordered = true,
  padding = 'md',
  bodyStyle,
  className,
  children,
  ...rest
}: PropsWithChildren<Props>) {
  const cls = [
    styles.card,
    bordered ? styles.bordered : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ')
  return (
    <section className={cls} {...rest}>
      {(title || extra) && (
        <header className={styles.head}>
          <div className={styles.title}>{title}</div>
          {extra && <div className={styles.extra}>{extra}</div>}
        </header>
      )}
      <div
        className={[styles.body, styles[`p-${padding}`]].join(' ')}
        style={bodyStyle}
      >
        {children}
      </div>
    </section>
  )
}
