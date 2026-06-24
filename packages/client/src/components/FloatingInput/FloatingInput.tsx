import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react'
import styles from './FloatingInput.module.css'

export interface FloatingInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'placeholder' | 'size'> {
  /** 浮动标签文本 */
  label: string
  /** 错误态边框（红色） */
  invalid?: boolean
  /** 末尾插槽：眼睛、清除按钮、单位等 */
  suffix?: ReactNode
}

/**
 * Material 风格 outlined 输入框：标签在 placeholder 位置，
 * 聚焦或有值时浮到左上角并在边框上"挖"出一个缺口。
 *
 * 核心机制：
 *  1. input 必须带 placeholder=" "，才能让 :placeholder-shown 工作；
 *  2. fieldset > legend 自带"top-border 留 legend 宽度的缺口"行为，
 *     legend 收 0 宽 → 完整边框；展开 → 缺口刚好包住浮起来的 label。
 */
export const FloatingInput = forwardRef<HTMLInputElement, FloatingInputProps>(
  function FloatingInput(
    { label, invalid, disabled, id, className, suffix, ...rest },
    ref,
  ) {
    const autoId = useId()
    const inputId = id ?? autoId

    const cls = [
      styles.wrap,
      invalid ? styles.invalid : '',
      disabled ? styles.disabled : '',
      className ?? '',
    ]
      .filter(Boolean)
      .join(' ')

    return (
      <div className={cls}>
        <input
          ref={ref}
          id={inputId}
          className={styles.input}
          // 必填的"空 placeholder"——让 :placeholder-shown 可用
          placeholder=" "
          disabled={disabled}
          {...rest}
        />
        <label htmlFor={inputId} className={styles.label}>
          {label}
        </label>
        {suffix && <span className={styles.suffix}>{suffix}</span>}
        <fieldset className={styles.notch} aria-hidden>
          <legend className={styles.legend}>
            <span>{label}</span>
          </legend>
        </fieldset>
      </div>
    )
  },
)
