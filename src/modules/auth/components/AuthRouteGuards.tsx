import { Navigate, Outlet, useLocation } from "react-router";
import { useAuthStore } from "@/stores/useAuthStore";

function AuthLoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-auth-bg text-auth-title font-auth">
      <p className="text-sm text-auth-label">Cargando sesión…</p>
    </div>
  );
}

/** Rutas públicas: login, register, landing */
export function GuestRoute() {
  const loading = useAuthStore((s) => s.loading);
  const user = useAuthStore((s) => s.user);
  const profileComplete = useAuthStore((s) => s.profileComplete);

  if (loading) return <AuthLoadingScreen />;

  if (user && profileComplete === true) {
    return <Navigate to="/dashboard" replace />;
  }

  if (user && profileComplete === false) {
    return <Navigate to="/complete-profile" replace />;
  }

  return <Outlet />;
}

/** Requiere sesión Firebase activa */
export function RequireAuth() {
  const loading = useAuthStore((s) => s.loading);
  const user = useAuthStore((s) => s.user);
  const location = useLocation();

  if (loading) return <AuthLoadingScreen />;

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}

/** Solo usuarios con perfil incompleto */
export function RequireIncompleteProfile() {
  const loading = useAuthStore((s) => s.loading);
  const user = useAuthStore((s) => s.user);
  const profileComplete = useAuthStore((s) => s.profileComplete);
  const pendingProfileSuccessModal = useAuthStore(
    (s) => s.pendingProfileSuccessModal
  );

  if (loading) return <AuthLoadingScreen />;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (profileComplete === true && !pendingProfileSuccessModal) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}

/** App protegida: sesión + profileComplete */
export function RequireCompleteProfile() {
  const loading = useAuthStore((s) => s.loading);
  const user = useAuthStore((s) => s.user);
  const profileComplete = useAuthStore((s) => s.profileComplete);
  const location = useLocation();

  if (loading) return <AuthLoadingScreen />;

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (profileComplete === false) {
    return <Navigate to="/complete-profile" replace />;
  }

  return <Outlet />;
}
