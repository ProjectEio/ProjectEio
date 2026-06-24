import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import { ThemeProvider } from '@/theme/ThemeProvider'
import { AuthProvider } from '@/auth/AuthProvider'
import { NotifyContainer } from '@/notify'

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RouterProvider router={router} />
        <NotifyContainer />
      </AuthProvider>
    </ThemeProvider>
  )
}
