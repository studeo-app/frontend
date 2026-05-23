import { createBrowserRouter } from 'react-router'
import AppLayout from './layouts/AppLayout'
import LandingPage from './modules/landing/pages/LandingPage'
import LoginPage from './modules/auth/pages/LoginPage'
import RegisterPage from './modules/auth/pages/RegisterPage'
import RoomPage from './modules/rooms/pages/RoomPage'
import ProfilePage from './modules/users/pages/ProfilePage'
import PublicLayout from './layouts/PublicLayout'
import CompleteProfilePage from './modules/users/pages/CompleteProfilePage'
import DashboardPage from './modules/dashboard/pages/DashboardPage'
import NotFoundPage from './shared/pages/NotFoundPage'

const appRoutes = [
  {
    index: true,
    element: <DashboardPage />,
  },
  {
    path: 'profile',
    element: <ProfilePage />,
  },
]

export const Router = createBrowserRouter([
  // PUBLIC ROUTES
  {
    element: <PublicLayout />,
    children: [
      {
        index: true,
        element: <LandingPage />,
      },
      {
        path: 'login',
        element: <LoginPage />,
      },
      {
        path: 'register',
        element: <RegisterPage />,
      },
      {
        path: 'complete-profile',
        element: <CompleteProfilePage />,
      },
      {
        path: 'room/:id',
        element: <RoomPage />,
      },
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },

  // APP ROUTES
  {
    path: 'app',
    element: <AppLayout />,
    children: appRoutes,
  },
  {
    path: 'dashboard',
    element: <AppLayout />,
    children: appRoutes,
  },
])
