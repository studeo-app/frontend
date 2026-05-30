import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

import { Input } from "@/shared/components/ui/Input";

import { useForm } from "@/shared/hooks/useForm";

import GoogleSignInButton from "../components/GoogleSignInButton";
import { authClasses, authInputClass } from "../theme/authTheme";

interface LoginFormProps {
  onSubmit: (data: {
    email: string;
    password: string;
  }) => Promise<void>;

  onGoogleLogin: () => Promise<void>;
  googleError?: string | null;
  onGoogleError?: (message: string) => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  onSubmit,
  onGoogleLogin,
  googleError,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [hasCredentialError, setHasCredentialError] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    fields,
    handleChange,
    handleBlur,
    validateAll,
    getFieldError,
    shouldShowFieldError,
  } = useForm({
    email: {
      value: "",
      rules: {
        required: true,
        email: true,
      },
    },
    password: {
      value: "",
      rules: {
        required: true,
        minLength: 6,
      },
    },
  });

  const emailError = getFieldError("email", showErrors);
  const passwordError = getFieldError("password", showErrors);

  const emailInvalid =
    (shouldShowFieldError("email", showErrors) && !!emailError) ||
    hasCredentialError;

  const passwordInvalid =
    (shouldShowFieldError("password", showErrors) && !!passwordError) ||
    hasCredentialError;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setShowErrors(true);
    setHasCredentialError(false);

    if (!validateAll()) return;

    setIsLoading(true);

    try {
      await onSubmit({
        email: fields.email.value,
        password: fields.password.value,
      });
    } catch (err: unknown) {
      const isInvalidCred =
        (err &&
          typeof err === "object" &&
          "code" in err &&
          (err as { code: string }).code === "auth/invalid-credential") ||
        (err instanceof Error && err.message.includes("invalid-credential"));

      if (isInvalidCred) {
        setHasCredentialError(true);
      }

      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div className={authClasses.field}>
        <label htmlFor="email" className={authClasses.labelLogin}>
          Email
          <span aria-hidden="true"> *</span>
        </label>

        <Input
          id="email"
          name="email"
          type="email"
          value={fields.email.value}
          onChange={(e) => {
            setHasCredentialError(false);
            handleChange(e);
          }}
          onBlur={() => handleBlur("email")}
          placeholder="tu@email.com"
          disabled={isLoading}
          autoComplete="email"
          aria-invalid={emailInvalid}
          aria-required="true"
          aria-describedby={emailError ? "email-error" : "email-help"}
          className={authInputClass({
            invalid: emailInvalid,
            size: "login",
          })}
        />

        {emailError && (
          <p id="email-error" className={authClasses.errorText} role="alert">
            {emailError}
          </p>
        )}

        {!emailError && (
          <p id="email-help" className={authClasses.helpText}>
            Ingresa el correo con el que creaste tu cuenta.
          </p>
        )}
      </div>

      <div className={authClasses.field}>
        <div className="flex items-center justify-between">
          <label htmlFor="password" className={authClasses.labelLogin}>
            Contraseña
            <span aria-hidden="true"> *</span>
          </label>

          <button
            type="button"
            className={`${authClasses.subtitle} rounded-sm text-xs transition-colors hover:text-auth-title`}
          >
            ¿Olvidaste tu contraseña?
          </button>
        </div>

        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            value={fields.password.value}
            onChange={(e) => {
              setHasCredentialError(false);
              handleChange(e);
            }}
            onBlur={() => handleBlur("password")}
            placeholder="••••••••"
            disabled={isLoading}
            autoComplete="current-password"
            aria-invalid={passwordInvalid}
            aria-required="true"
            aria-describedby={
              passwordError ? "password-error" : "password-help"
            }
            className={authInputClass({
              invalid: passwordInvalid,
              size: "login",
              extra: "pr-10",
            })}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center text-auth-icon hover:text-auth-title focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-auth-btn focus-visible:ring-offset-2 focus-visible:ring-offset-auth-bg rounded-md p-1"
            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>

        {passwordError && (
          <p id="password-error" className={authClasses.errorText} role="alert">
            {passwordError}
          </p>
        )}

        {!passwordError && (
          <p id="password-help" className={authClasses.helpText}>
            Ingresa tu contraseña secreta.
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className={`${authClasses.btnPrimary} flex h-9 w-full items-center justify-center rounded-xl text-sm font-medium transition-all duration-200 disabled:pointer-events-none disabled:opacity-50`}
      >
        {isLoading ? "Iniciando sesión…" : "Iniciar sesión"}
      </button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className={authClasses.dividerLine} />
        </div>
        <div className="relative flex justify-center">
          <span className={authClasses.dividerText}>o continúa con</span>
        </div>
      </div>

      <GoogleSignInButton
        onSignIn={onGoogleLogin}
        disabled={isLoading}
        errorMessage={googleError}
      />

      <p className={`${authClasses.subtitle} pt-2 text-center text-sm`}>
        ¿No tienes cuenta?{" "}
        <a href="/register" className={authClasses.link}>
          Crear cuenta
        </a>
      </p>
    </form>
  );
};
