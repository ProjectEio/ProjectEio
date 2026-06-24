import styles from './Spinner.module.css'

interface Props {
  size?: number
  tip?: string
}

export function Spinner({ size = 18, tip }: Props) {
  return (
    <span className={styles.wrap}>
      <span
        className={styles.spin}
        style={{ width: size, height: size, borderWidth: Math.max(2, size / 9) }}
        aria-hidden
      />
      {tip && <span className={styles.tip}>{tip}</span>}
    </span>
  )
}
