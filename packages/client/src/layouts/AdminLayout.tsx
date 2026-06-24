import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Button } from '@/components/Button'
import { RainbowText } from '@/components/RainbowText'
import { ThemeToggle } from '@/components/ThemeToggle'
import { useAuth } from '@/auth/useAuth'
import styles from './AdminLayout.module.css'

const NAV = [
  { to: '/', label: '概览', end: true },
  { to: '/about', label: '关于' },
] as const

export function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const onLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.left}>
          <span className={styles.brand}>
            <span className={styles.logoMark}>◆</span>
            <RainbowText className={styles.brandText}>Eio Console</RainbowText>
          </span>
          <nav className={styles.nav}>
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={'end' in n ? n.end : false}
                className={({ isActive }) =>
                  isActive ? styles.navItemActive : styles.navItem
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className={styles.right}>
          <ThemeToggle />
          {user && (
            <span className={styles.user} title={user.username}>
              {user.displayName}
            </span>
          )}
          <Button size="sm" onClick={() => void onLogout()}>
            退出
          </Button>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.content}>
          <Outlet />
        </div>
      </main>
    </div>
  )
}
