import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react'
import { http, setToken, getToken, HttpError } from '@/lib/http'
import type { AuthUser } from '@/types/api'

export interface AuthContextValue {
  user: AuthUser | null
  status: 'idle' | 'loading' | 'authenticated' | 'unauthenticated'
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [status, setStatus] = useState<AuthContextValue['status']>('idle')

  // 启动时若有 token 就拉一次 me
  useEffect(() => {
    const token = getToken()
    if (!token) {
      setStatus('unauthenticated')
      return
    }
    setStatus('loading')
    http
      .get<{ user: AuthUser }>('/api/auth/me')
      .then((r) => {
        setUser(r.user)
        setStatus('authenticated')
      })
      .catch(() => {
        setToken(null)
        setUser(null)
        setStatus('unauthenticated')
      })
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    setStatus('loading')
    try {
      const res = await http.post<{ token: string; user: AuthUser }>(
        '/api/auth/login',
        { username, password },
      )
      setToken(res.token)
      setUser(res.user)
      setStatus('authenticated')
    } catch (err) {
      setStatus('unauthenticated')
      if (err instanceof HttpError) throw err
      throw new HttpError('网络错误', 0, err)
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      await http.post('/api/auth/logout')
    } catch {
      /* ignore */
    }
    setToken(null)
    setUser(null)
    setStatus('unauthenticated')
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ user, status, login, logout }),
    [user, status, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
