/** 极简事件源 + 全局函数 API：在任何位置都能调用 notify.xxx() */

export type NotifyKind = 'success' | 'error' | 'warning' | 'info'

export interface NotifyItem {
  id: number
  kind: NotifyKind
  message: string
  description?: string | undefined
  /** 自动关闭毫秒数，0 = 不自动关 */
  duration: number
}

export interface NotifyOptions {
  description?: string
  duration?: number
}

type Listener = (items: NotifyItem[]) => void

class NotifyStore {
  private items: NotifyItem[] = []
  private listeners = new Set<Listener>()
  private seq = 0

  /** React useSyncExternalStore 用 */
  subscribe = (cb: Listener) => {
    this.listeners.add(cb)
    return () => this.listeners.delete(cb)
  }
  getSnapshot = () => this.items

  private emit() {
    for (const l of this.listeners) l(this.items)
  }

  push(kind: NotifyKind, message: string, options?: NotifyOptions): number {
    const id = ++this.seq
    const item: NotifyItem = {
      id,
      kind,
      message,
      description: options?.description,
      duration: options?.duration ?? 3200,
    }
    this.items = [...this.items, item]
    this.emit()
    if (item.duration > 0) {
      window.setTimeout(() => this.dismiss(id), item.duration)
    }
    return id
  }

  dismiss(id: number) {
    const before = this.items.length
    this.items = this.items.filter((i) => i.id !== id)
    if (this.items.length !== before) this.emit()
  }

  clear() {
    if (!this.items.length) return
    this.items = []
    this.emit()
  }
}

export const notifyStore = new NotifyStore()

/** 全局调用入口：在任何文件 import 即可使用 */
export const notify = {
  success: (message: string, options?: NotifyOptions) =>
    notifyStore.push('success', message, options),
  error: (message: string, options?: NotifyOptions) =>
    notifyStore.push('error', message, options),
  warning: (message: string, options?: NotifyOptions) =>
    notifyStore.push('warning', message, options),
  info: (message: string, options?: NotifyOptions) =>
    notifyStore.push('info', message, options),
  dismiss: (id: number) => notifyStore.dismiss(id),
  clear: () => notifyStore.clear(),
}
