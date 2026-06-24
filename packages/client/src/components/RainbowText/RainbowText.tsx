import type { PropsWithChildren } from 'react'
import styles from './RainbowText.module.css'

interface Props {
  className?: string
}

/**
 * 让文字背上一道循环流动的多彩渐变，3 秒一个周期；
 * 不支持 background-clip: text 的浏览器会回退到 --text-primary。
 */
export function RainbowText({
  className,
  children,
}: PropsWithChildren<Props>) {
  const cls = [styles.rainbow, className].filter(Boolean).join(' ')
  return <span className={cls}>{children}</span>
}
