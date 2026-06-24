import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react'

export type Theme = 'light' | 'dark'

export interface ThemeContextValue {
  theme: Theme
  setTheme: (t: Theme) => void
  toggle: () => void
  /** 用户是否手动选择过（false = 跟随系统）。 */
  isManual: boolean
}

export const ThemeContext = createContext<ThemeContextValue | null>(null)

const STORAGE_KEY = 'eio.theme'

function readStored(): Theme | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    return v === 'light' || v === 'dark' ? v : null
  } catch {
    return null
  }
}

function systemPref(): Theme {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

function applyTheme(t: Theme) {
  document.documentElement.dataset['theme'] = t
}

export function ThemeProvider({ children }: PropsWithChildren) {
  const [manual, setManual] = useState<Theme | null>(() => readStored())
  const [systemTheme, setSystemTheme] = useState<Theme>(() => systemPref())

  // 监听系统切换
  useEffect(() => {
    if (!window.matchMedia) return
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light')
    }
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  const theme: Theme = manual ?? systemTheme

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  const setTheme = useCallback((t: Theme) => {
    setManual(t)
    try {
      localStorage.setItem(STORAGE_KEY, t)
    } catch {
      /* noop */
    }
  }, [])

  const toggle = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }, [theme, setTheme])

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, setTheme, toggle, isManual: manual !== null }),
    [theme, setTheme, toggle, manual],
  )

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  )
}
