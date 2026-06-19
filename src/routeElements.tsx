import { lazy, Suspense, type ReactNode } from 'react'

export const AppLayout = lazy(() => import('./layouts/AppLayout'))
export const LandingLayout = lazy(() => import('./layouts/LandingLayout'))
export const PublicLayout = lazy(() => import('./layouts/PublicLayout'))
export const RoomLayout = lazy(() => import('./modules/rooms/layouts/RoomLayout'))
export const LandingPage = lazy(() => import('./modules/landing/pages/LandingPage'))
export const LoginPage = lazy(() => import('./modules/auth/pages/LoginPage'))
export const RegisterPage = lazy(() => import('./modules/auth/pages/RegisterPage'))
export const CompleteProfilePage = lazy(() => import('./modules/auth/pages/CompleteProfilePage'))
export const DashboardPage = lazy(() => import('./modules/dashboard/pages/DashboardPage'))
export const ProfilePage = lazy(() => import('./modules/users/pages/ProfilePage'))
export const RoomLobbyPage = lazy(() => import('./modules/rooms/pages/RoomLobbyPage'))
export const RoomPage = lazy(() => import('./modules/rooms/pages/RoomPage'))
export const NotFoundPage = lazy(() => import('./shared/pages/NotFoundPage'))

export function RouteSuspense({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={(
        <div
          className="flex min-h-screen items-center justify-center bg-auth-bg text-sm text-auth-label"
          role="status"
          aria-live="polite"
        >
          Cargando…
        </div>
      )}
    >
      {children}
    </Suspense>
  )
}
