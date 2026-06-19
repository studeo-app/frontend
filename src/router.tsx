import type { ReactNode } from 'react'
import { createBrowserRouter, Navigate } from "react-router";
import {
  GuestRoute,
  RequireCompleteProfile,
  RequireIncompleteProfile,
} from "./modules/auth/components/AuthRouteGuards";
import {
  AppLayout,
  CompleteProfilePage,
  DashboardPage,
  LandingLayout,
  LandingPage,
  LoginPage,
  NotFoundPage,
  ProfilePage,
  PublicLayout,
  RegisterPage,
  RoomLayout,
  RoomLobbyPage,
  RoomPage,
  RouteSuspense,
} from './routeElements'

const routeElement = (element: ReactNode) => <RouteSuspense>{element}</RouteSuspense>

export const Router = createBrowserRouter([
  {
    element: routeElement(<LandingLayout />),
    children: [
      {
        element: <GuestRoute />,
        children: [
          {
            index: true,
            element: routeElement(<LandingPage />),
          },
          {
            path: "login",
            element: routeElement(<LoginPage />),
          },
          {
            path: "register",
            element: routeElement(<RegisterPage />),
          },
        ],
      },
    ],
  },

  // PUBLIC ROUTES
  {
    element: routeElement(<PublicLayout />),
    children: [
      {
        path: "completar-perfil",
        element: <Navigate to="/complete-profile" replace />,
      },
      {
        element: <RequireIncompleteProfile />,
        children: [
          {
            path: "complete-profile",
            element: routeElement(<CompleteProfilePage />),
          },
        ],
      },
      {
        path: "*",
        element: routeElement(<NotFoundPage />),
      },
    ],
  },
  {
    element: <RequireCompleteProfile />,
    children: [
      {
        element: routeElement(<AppLayout />),
        children: [
          {
            index: true,
            element: <Navigate to="/dashboard" replace />,
          },
          {
            path: "dashboard",
            element: routeElement(<DashboardPage />),
          },
          {
            path: "profile",
            element: routeElement(<ProfilePage />),
          },
        ],
      },
      {
        element: routeElement(<RoomLayout />),
        children: [
          {
            path: "room/:id/lobby",
            element: routeElement(<RoomLobbyPage />),
          },
          {
            path: "room/:id",
            element: routeElement(<RoomPage />),
          },
        ],
      },
    ],
  },
]);
