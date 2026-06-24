import { createBrowserRouter } from 'react-router-dom'
import { RootLayout } from '@/layouts/RootLayout'
import IntroPage from '@/pages/intro'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <IntroPage /> },
      // 预留: { path: 'console', element: <ConsolePage /> },
      // 预留: { path: 'plugins', element: <PluginsPage /> },
    ],
  },
])
