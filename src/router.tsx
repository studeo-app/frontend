import { createBrowserRouter, Navigate } from "react-router";
import AppLayout from "./layouts/AppLayout";
import LandingPage from "./modules/landing/pages/LandingPage";
import LoginPage from "./modules/auth/pages/LoginPage";
import RegisterPage from "./modules/auth/pages/RegisterPage";
import RoomPage from "./modules/rooms/pages/RoomPage";
import ProfilePage from "./modules/users/pages/ProfilePage";
import LandingLayout from "./layouts/LandingLayout";
import PublicLayout from "./layouts/PublicLayout";
import CompleteProfilePage from "./modules/auth/pages/CompleteProfilePage";
import DashboardPage from "./modules/dashboard/pages/DashboardPage";
import NotFoundPage from "./shared/pages/NotFoundPage";
import {
  GuestRoute,
  RequireCompleteProfile,
  RequireIncompleteProfile,
} from "./modules/auth/components/AuthRouteGuards";

export const Router = createBrowserRouter([
  {
    element: <LandingLayout />,
    children: [
      {
        element: <GuestRoute />,
        children: [
          {
            index: true,
            element: <LandingPage />,
          },
          {
            path: "login",
            element: <LoginPage />,
          },
          {
            path: "register",
            element: <RegisterPage />,
          },
        ],
      },
    ],
  },

  // PUBLIC ROUTES
  {
    element: <PublicLayout />,
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
            element: <CompleteProfilePage />,
          },
        ],
      },
      {
        path: "*",
        element: <NotFoundPage />,
      },
    ],
  },
  {
    element: <RequireCompleteProfile />,
    children: [
      {
        element: <AppLayout />,
        children: [
          {
            index: true,
            element: <Navigate to="/dashboard" replace />,
          },
          {
            path: "dashboard",
            element: <DashboardPage />,
          },
          {
            path: "profile",
            element: <ProfilePage />,
          },
          {
            path: "room/:id",
            element: <RoomPage />,
          },
        ],
      },
    ],
  },
]);
