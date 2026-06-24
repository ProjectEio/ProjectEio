import { useState, type FormEvent } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { Button } from '@/components/Button'
import { Checkbox } from '@/components/Checkbox'
import { FloatingInput } from '@/components/FloatingInput'
import { RainbowText } from '@/components/RainbowText'
import { ThemeToggle } from '@/components/ThemeToggle'
import { useAuth } from '@/auth/useAuth'
import { HttpError } from '@/lib/http'
import { notify } from '@/notify'
import styles from './LoginPage.module.css'

interface LocState {
  from?: string
}

const LoginIcon = (
  <svg
    viewBox="0 0 24 24"
    width="16"
    height="16"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
    <polyline points="10 17 15 12 10 7" />
    <line x1="15" y1="12" x2="3" y2="12" />
  </svg>
)

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as LocState | null)?.from ?? '/'

  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('admin123')
  const [remember, setRemember] = useState(true)
  const [showPwd, setShowPwd] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await login(username.trim(), password)
      notify.success('登录成功')
      navigate(from, { replace: true })
    } catch (err) {
      const msg =
        err instanceof HttpError ? err.message : '登录失败，请稍后重试'
      setError(msg)
      notify.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.topbar}>
        <Link to="/about" className={styles.brand}>
          <span className={styles.logoMark}>◆</span>
          <RainbowText>Eio</RainbowText>
        </Link>
        <ThemeToggle />
      </header>

      <main className={styles.main}>
        <section className={styles.panel}>
          <h1 className={styles.title}>登录你的账号</h1>

          <form onSubmit={onSubmit} noValidate>
            <div className={styles.field}>
              <FloatingInput
                label="账号"
                id="username"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={submitting}
              />
            </div>

            <div className={styles.field}>
              <FloatingInput
                label="密码"
                id="password"
                type={showPwd ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={submitting}
                suffix={
                  <button
                    type="button"
                    className={styles.eye}
                    onClick={() => setShowPwd((v) => !v)}
                    aria-label={showPwd ? '隐藏密码' : '显示密码'}
                    tabIndex={-1}
                  >
                    {showPwd ? '隐藏' : '显示'}
                  </button>
                }
              />
            </div>

            <div className={styles.row}>
              <Checkbox
                label="记住我"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              <a className={styles.forgot} href="#">
                忘记密码？
              </a>
            </div>

            {error && (
              <div className={styles.error} role="alert">
                {error}
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              block
              loading={submitting}
              icon={LoginIcon}
              className={styles.submit}
            >
              登 录
            </Button>
          </form>
        </section>
      </main>
    </div>
  )
}
