import { useState, type FormEvent } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { Checkbox } from '@/components/Checkbox'
import { FormField } from '@/components/FormField'
import { Input } from '@/components/Input'
import { ThemeToggle } from '@/components/ThemeToggle'
import { useAuth } from '@/auth/useAuth'
import { HttpError } from '@/lib/http'
import styles from './LoginPage.module.css'

interface LocState {
  from?: string
}

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as LocState | null)?.from ?? '/'

  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('admin123')
  const [remember, setRemember] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await login(username.trim(), password)
      navigate(from, { replace: true })
    } catch (err) {
      const msg =
        err instanceof HttpError
          ? err.message
          : '登录失败，请稍后重试'
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.topbar}>
        <Link to="/about" className={styles.brand}>
          <span className={styles.logoMark}>◆</span>
          <span>Eio</span>
        </Link>
        <ThemeToggle />
      </header>

      <main className={styles.main}>
        <Card className={styles.card} padding="lg">
          <h1 className={styles.title}>登录你的账号</h1>
          <p className={styles.subtitle}>
            进入控制台，管理节点池与插件
          </p>

          <form onSubmit={onSubmit} noValidate>
            <FormField label="账号" htmlFor="username" required>
              <Input
                id="username"
                size="lg"
                autoComplete="username"
                placeholder="请输入账号"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={submitting}
              />
            </FormField>

            <FormField label="密码" htmlFor="password" required>
              <Input
                id="password"
                type="password"
                size="lg"
                autoComplete="current-password"
                placeholder="请输入密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={submitting}
              />
            </FormField>

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
            >
              登 录
            </Button>
          </form>

          <div className={styles.hint}>
            演示账号：<code>admin</code> / <code>admin123</code>
          </div>
        </Card>
      </main>
    </div>
  )
}
