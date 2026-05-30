import React, { useCallback, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useAuthStore } from "@/stores/useAuthStore";
import { RegisterForm } from "../components/RegisterForm";
import { ErrorModal } from "@/shared/components/ui/ErrorModal";
import { AuthPageLayout } from "../components/AuthPageLayout";
import { authClasses } from "../theme/authTheme";
import { getPostAuthPath } from "../utils/authNavigation";
import { useAuthErrorModal } from "../hooks/useAuthErrorModal";
import { backendCheck } from "@/modules/users/api/usersApi";
import { resolveAuthErrorMessage } from "../utils/firebaseAuthErrors";

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const registerWithEmail = useAuthStore((state) => state.registerWithEmail);
  const loginWithGoogle = useAuthStore((state) => state.loginWithGoogle);
  const { isErrorOpen, errorMsg, showAuthError, closeAuthError } =
    useAuthErrorModal();
  const [googleError, setGoogleError] = useState<string | null>(null);
  // Usamos ref para capturar el error de Google y abrirlo en el siguiente tick,
  // evitando que el ciclo async de Firebase (onAuthStateChanged, deleteUser)
  // interfiera con el estado del modal antes de que se pueda mostrar.
  const googleErrorRef = useRef<string | null>(null);
  const [googleModalOpen, setGoogleModalOpen] = useState(false);
  const [googleModalMsg, setGoogleModalMsg] = useState("");

  const handleRegister = useCallback(
    async (data: {
      firstName: string;
      lastName: string;
      email: string;
      password: string;
    }) => {
      try {
        const email = data.email?.toLowerCase() ?? "";
        // Acepta cualquier correo institucional con dominio .edu (usc.edu.co, correounivalle.edu.co, uao.edu.co, etc.)
        const domain = email.split("@")[1] ?? "";
        if (!/\.edu(\.[a-z]{2,})?$/.test(domain)) {
          showAuthError(
            new Error("Solo se puede crear una cuenta con correo institucional (.edu)"),
            "register-email"
          );
          return;
        }

        await backendCheck();
      
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
    setGoogleError(null);
    googleErrorRef.current = null;

    try {
      await backendCheck();
      const result = await loginWithGoogle();
      navigate(getPostAuthPath(result.profileComplete));
    } catch (err: unknown) {
      // Resolvemos el mensaje ANTES del ciclo async de Firebase
      const message = resolveAuthErrorMessage(err, "google");
      googleErrorRef.current = message;

      // setTimeout(0) garantiza que el modal se abre en el siguiente tick del
      // event loop, DESPUÉS de que Firebase termine su onAuthStateChanged y
      // el componente haya estabilizado su estado.
      setTimeout(() => {
        setGoogleModalMsg(googleErrorRef.current ?? message);
        setGoogleModalOpen(true);
      }, 0);
    }
  }, [loginWithGoogle, navigate]);

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
          googleError={googleError}
          onGoogleError={setGoogleError}
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

      {/* Modal dedicado para errores de Google — se abre en el siguiente tick
          para evitar interferencias con el ciclo async de Firebase */}
      <ErrorModal
        isOpen={googleModalOpen}
        onClose={() => setGoogleModalOpen(false)}
        message={googleModalMsg}
      />
    </AuthPageLayout>
  );
};

export default RegisterPage;
