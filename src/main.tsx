import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import { Router } from './router.tsx'
import './index.css'
import ThemeProvider from './shared/theme/providers/ThemeProvider.tsx'
import '@/stores/useAuthStore'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <RouterProvider router={Router} />
    </ThemeProvider>
  </StrictMode>,
)
