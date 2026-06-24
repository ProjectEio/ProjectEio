import { Navigate, useLocation } from 'react-router-dom'
import type { PropsWithChildren } from 'react'
import { Spinner } from '@/components/Spinner'
import { useAuth } from './useAuth'

export function ProtectedRoute({ children }: PropsWithChildren) {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'loading' || status === 'idle') {
    return (
      <div
        style={{
          minHeight: '60vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Spinner tip="加载中" size={20} />
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <>{children}</>
}
