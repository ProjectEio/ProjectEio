import type { InputHTMLAttributes, ReactNode } from 'react'
import styles from './Checkbox.module.css'

export interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'children'> {
  label?: ReactNode
}

export function Checkbox({
  label,
  className,
  disabled,
  ...rest
}: CheckboxProps) {
  const cls = [
    styles.wrap,
    disabled ? styles.disabled : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ')
  return (
    <label className={cls}>
      <input
        type="checkbox"
        className={styles.input}
        disabled={disabled}
        {...rest}
      />
      <span className={styles.box} aria-hidden>
        <svg viewBox="0 0 16 16" className={styles.tick}>
          <path
            d="M3.5 8.5l3 3 6-7"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      {label != null && <span className={styles.label}>{label}</span>}
    </label>
  )
}
