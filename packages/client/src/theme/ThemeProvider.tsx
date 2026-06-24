import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react'

export type ThemePreference = 'system' | 'light' | 'dark'
export type ResolvedTheme = 'light' | 'dark'

type ViewTransitionDocument = Document & {
  startViewTransition?: (updateCallback: () => void) => {
    ready: Promise<void>
    finished: Promise<void>
  }
}

export interface ThemeContextValue {
  /** 用户选择：跟随系统 / 浅色 / 深色 */
  preference: ThemePreference
  /** 实际渲染的主题（system 解析后） */
  theme: ResolvedTheme
  /** 旧 API 兼容别名 */
  resolvedTheme: ResolvedTheme
  setPreference: (p: ThemePreference) => void
  /** 在 light / dark 之间切换；自动带 View Transition 斜线动画 */
  toggle: () => void
  isManual: boolean
}

export const ThemeContext = createContext<ThemeContextValue | null>(null)

const STORAGE_KEY = 'eio.theme'
const QUERY = '(prefers-color-scheme: dark)'
const SWEEP_MS = 1200

function isPref(v: unknown): v is ThemePreference {
  return v === 'system' || v === 'light' || v === 'dark'
}

function readStored(): ThemePreference {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    return isPref(v) ? v : 'system'
  } catch {
    return 'system'
  }
}

function readSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light'
  return window.matchMedia(QUERY).matches ? 'dark' : 'light'
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return true
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function applyDocumentTheme(t: ResolvedTheme) {
  if (typeof document === 'undefined') return
  document.documentElement.dataset['theme'] = t
  document.documentElement.style.colorScheme = t
}

function clearRevealFlag() {
  if (typeof document === 'undefined') return
  delete document.documentElement.dataset['themeReveal']
}

export function ThemeProvider({ children }: PropsWithChildren) {
  const [preference, setPreferenceState] = useState<ThemePreference>(() =>
    readStored(),
  )
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(() =>
    readSystemTheme(),
  )

  const theme: ResolvedTheme =
    preference === 'system' ? systemTheme : preference

  // 监听系统主题变化
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mql = window.matchMedia(QUERY)
    const onChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light')
    }
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  // 同步到 <html>
  useEffect(() => {
    applyDocumentTheme(theme)
  }, [theme])

  /** 写入 preference + 持久化（不含动画，由 toggle 决定要不要包动画） */
  const persistPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* noop */
    }
  }, [])

  const setPreference = useCallback(
    (next: ThemePreference) => {
      persistPreference(next)
    },
    [persistPreference],
  )

  /** 在 light / dark 之间切换，附带 View Transition 斜线揭示动画。 */
  const toggle = useCallback(() => {
    const next: ThemePreference = theme === 'dark' ? 'light' : 'dark'

    // 没有 document 或用户关动效 → 瞬切
    if (typeof document === 'undefined' || prefersReducedMotion()) {
      persistPreference(next)
      return
    }
    const doc = document as ViewTransitionDocument
    if (typeof doc.startViewTransition !== 'function') {
      persistPreference(next)
      return
    }

    clearRevealFlag()
    document.documentElement.dataset['themeReveal'] = 'true'

    const transition = doc.startViewTransition(() => {
      persistPreference(next)
    })

    transition.ready
      .then(() => {
        // 新主题快照用一条 45° 斜线从左上揭示到右下。
        // 三角形 (0,0)(K,0)(0,K) 的斜边恒为 45°；K 从 0 扫到 200% 时，
        // 斜边 x+y=K 越过右下角 (100%,100%)，刚好盖满全屏。
        const from = 'polygon(0% 0%, 0% 0%, 0% 0%)'
        const to = 'polygon(0% 0%, 200% 0%, 0% 200%)'
        document.documentElement.animate(
          { clipPath: [from, to], WebkitClipPath: [from, to] },
          {
            duration: SWEEP_MS,
            easing: 'cubic-bezier(0.65, 0, 0.35, 1)',
            fill: 'forwards',
            pseudoElement: '::view-transition-new(root)',
          },
        )
      })
      .catch(() => clearRevealFlag())

    transition.finished.finally(clearRevealFlag)
  }, [theme, persistPreference])

  const value = useMemo<ThemeContextValue>(
    () => ({
      preference,
      theme,
      resolvedTheme: theme,
      setPreference,
      toggle,
      isManual: preference !== 'system',
    }),
    [preference, theme, setPreference, toggle],
  )

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  )
}
