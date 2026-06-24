import type { PropsWithChildren, ReactNode } from 'react'
import styles from './FormField.module.css'

interface Props {
  label: ReactNode
  htmlFor?: string
  error?: string | null
  extra?: ReactNode
  required?: boolean
}

export function FormField({
  label,
  htmlFor,
  error,
  extra,
  required,
  children,
}: PropsWithChildren<Props>) {
  return (
    <div className={styles.field}>
      <label htmlFor={htmlFor} className={styles.label}>
        {required && <span className={styles.req} aria-hidden>*</span>}
        {label}
      </label>
      <div className={styles.control}>{children}</div>
      {(error || extra) && (
        <div className={error ? styles.error : styles.extra}>
          {error || extra}
        </div>
      )}
    </div>
  )
}
