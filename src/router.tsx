import { createBrowserRouter } from 'react-router'
import AppLayout from './layouts/AppLayout'
import LandingPage from './modules/landing/pages/LandingPage'
import LoginPage from './modules/auth/pages/LoginPage'
import RegisterPage from './modules/auth/pages/RegisterPage'
import RoomPage from './modules/rooms/pages/RoomPage'
import ProfilePage from './modules/users/pages/ProfilePage'
import PublicLayout from './layouts/PublicLayout'
import CompleteProfilePage from './modules/users/pages/CompleteProfilePage'

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
      }
    ],
  },

  // APP ROUTES
  {
    element: <AppLayout />,
    children: [
      {
        path: 'rooms/:id',
        element: <RoomPage />,
      },
      {
        path: 'profile',
        element: <ProfilePage />,
      },
      {

      }
    ],
  }
])
