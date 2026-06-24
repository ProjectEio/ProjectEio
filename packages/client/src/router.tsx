import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AdminLayout } from '@/layouts/AdminLayout'
import { ProtectedRoute } from '@/auth/ProtectedRoute'
import LoginPage from '@/pages/login/LoginPage'
import DashboardPage from '@/pages/dashboard/DashboardPage'
import AboutPage from '@/pages/about/AboutPage'

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AdminLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'about', element: <AboutPage /> },
      // 预留: { path: 'plugins', element: <PluginsPage /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
