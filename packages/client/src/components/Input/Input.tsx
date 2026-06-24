import {
  forwardRef,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react'
import styles from './Input.module.css'

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'prefix'> {
  size?: 'sm' | 'md' | 'lg'
  prefix?: ReactNode
  suffix?: ReactNode
  invalid?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input(
    { size = 'md', prefix, suffix, invalid, className, disabled, ...rest },
    ref,
  ) {
    const wrap = [
      styles.wrap,
      styles[`s-${size}`],
      invalid ? styles.invalid : '',
      disabled ? styles.disabled : '',
      className ?? '',
    ]
      .filter(Boolean)
      .join(' ')

    return (
      <span className={wrap}>
        {prefix && <span className={styles.affix}>{prefix}</span>}
        <input
          ref={ref}
          className={styles.input}
          disabled={disabled}
          {...rest}
        />
        {suffix && <span className={styles.affix}>{suffix}</span>}
      </span>
    )
  },
)
