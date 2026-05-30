import React, { useCallback } from "react";
import { useNavigate } from "react-router";
import { useAuthStore } from "@/stores/useAuthStore";
import { LoginForm } from "../components/LoginForm";
import { ErrorModal } from "@/shared/components/ui/ErrorModal";
import { AuthPageLayout } from "../components/AuthPageLayout";
import { authClasses } from "../theme/authTheme";
import { getPostAuthPath } from "../utils/authNavigation";
import { useAuthErrorModal } from "../hooks/useAuthErrorModal";

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const loginWithEmail = useAuthStore((state) => state.loginWithEmail);
  const loginWithGoogle = useAuthStore((state) => state.loginWithGoogle);
  const { isErrorOpen, errorMsg, showAuthError, closeAuthError } =
    useAuthErrorModal();

  const handleLogin = useCallback(
    async (data: { email: string; password: string }) => {
      try {
        const result = await loginWithEmail(data.email, data.password);
        navigate(getPostAuthPath(result.profileComplete));
      } catch (err: unknown) {
        showAuthError(err, "login-email");
        throw err;
      }
    },
    [loginWithEmail, navigate, showAuthError]
  );

  const handleGoogleLogin = useCallback(async () => {
    try {
      const result = await loginWithGoogle();
      navigate(getPostAuthPath(result.profileComplete));
    } catch (err: unknown) {
      showAuthError(err, "google");
    }
  }, [loginWithGoogle, navigate, showAuthError]);

  return (
    <AuthPageLayout>
      <div className="w-full max-w-105">
        <div className="mb-4">
          <span
            className={`${authClasses.logo} text-3xl font-bold tracking-tight`}
          >
            Studeo
          </span>
        </div>

        <div className="mb-4">
          <h1
            className={`${authClasses.title} text-4xl font-bold tracking-tight`}
          >
            Continúa en Studeo
          </h1>

          <p className={`${authClasses.subtitle} mt-3 text-base`}>
            Accede a tus salas de estudio, sesiones colaborativas y recursos
            compartidos.
          </p>
        </div>

        <LoginForm onSubmit={handleLogin} onGoogleLogin={handleGoogleLogin} />

        <p className={`${authClasses.footer} mt-8`}>
          Al continuar, aceptas nuestros{" "}
          <a href="/terms" className={authClasses.link}>
            Términos
          </a>{" "}
          y{" "}
          <a href="/policy" className={authClasses.link}>
            Política de privacidad
          </a>
          .
        </p>
      </div>

      <ErrorModal
        isOpen={isErrorOpen}
        onClose={closeAuthError}
        message={errorMsg}
      />
    </AuthPageLayout>
  );
};

export default LoginPage;
