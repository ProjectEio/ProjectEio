import { useSyncExternalStore, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { notifyStore, type NotifyItem, type NotifyKind } from './notifyStore'
import styles from './NotifyContainer.module.css'

const ICONS: Record<NotifyKind, ReactNode> = {
  success: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  error: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  warning: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    </svg>
  ),
  info: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <line x1="12" y1="11" x2="12" y2="16" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  ),
}

export function NotifyContainer() {
  const items = useSyncExternalStore(
    notifyStore.subscribe,
    notifyStore.getSnapshot,
    notifyStore.getSnapshot,
  )

  if (typeof document === 'undefined') return null

  return createPortal(
    <div className={styles.layer} aria-live="polite" aria-atomic="false">
      {items.map((it) => (
        <ToastItem key={it.id} item={it} />
      ))}
    </div>,
    document.body,
  )
}

function ToastItem({ item }: { item: NotifyItem }) {
  return (
    <div
      role="status"
      className={`${styles.toast} ${styles[`k-${item.kind}`]}`}
    >
      <span className={styles.icon}>{ICONS[item.kind]}</span>
      <span className={styles.body}>
        <span className={styles.msg}>{item.message}</span>
        {item.description && (
          <span className={styles.desc}>{item.description}</span>
        )}
      </span>
      <button
        type="button"
        className={styles.close}
        onClick={() => notifyStore.dismiss(item.id)}
        aria-label="关闭"
      >
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  )
}
