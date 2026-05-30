import React, { useCallback } from "react";
import { useNavigate } from "react-router";
import { useAuthStore } from "@/stores/useAuthStore";
import { RegisterForm } from "../components/RegisterForm";
import { ErrorModal } from "@/shared/components/ui/ErrorModal";
import { AuthPageLayout } from "../components/AuthPageLayout";
import { authClasses } from "../theme/authTheme";
import { getPostAuthPath } from "../utils/authNavigation";
import { useAuthErrorModal } from "../hooks/useAuthErrorModal";

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const registerWithEmail = useAuthStore((state) => state.registerWithEmail);
  const loginWithGoogle = useAuthStore((state) => state.loginWithGoogle);
  const { isErrorOpen, errorMsg, showAuthError, closeAuthError } =
    useAuthErrorModal();

  const handleRegister = useCallback(
    async (data: {
      firstName: string;
      lastName: string;
      email: string;
      password: string;
    }) => {
      try {
        const result = await registerWithEmail(
          data.email,
          data.password,
          data.firstName,
          data.lastName
        );
        navigate(getPostAuthPath(result.profileComplete));
      } catch (err: unknown) {
        showAuthError(err, "register-email");
        throw err;
      }
    },
    [registerWithEmail, navigate, showAuthError]
  );

  const handleGoogleRegister = useCallback(async () => {
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
        <div className="mb-2">
          <span
            className={`${authClasses.logo} text-xl font-bold tracking-tight`}
          >
            Studeo
          </span>
        </div>

        <div className="mb-2">
          <h1
            className={`${authClasses.title} text-2xl font-bold tracking-tight`}
          >
            Crea tu cuenta
          </h1>

          <p className={`${authClasses.subtitle} mt-2 text-base`}>
            Únete a tu comunidad de estudio
          </p>
        </div>

        <RegisterForm
          onSubmit={handleRegister}
          onGoogleRegister={handleGoogleRegister}
        />

        <p className={`${authClasses.footer} mt-8`}>
          Al continuar, aceptas nuestros{" "}
          <a href="/terms-of-service" className={authClasses.link}>
            Términos
          </a>{" "}
          y{" "}
          <a href="/privacy-policy" className={authClasses.link}>
            Política de privacidad
          </a>
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

export default RegisterPage;
