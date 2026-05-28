import React, { useState } from "react";

import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";

import { useForm } from "@/shared/hooks/useForm";

import GoogleSignInButton from "../components/GoogleSignInButton";

interface LoginFormProps {
  onSubmit: (data: {
    email: string;
    password: string;
  }) => Promise<void>;

  onGoogleLogin: () => Promise<void>;
}

const inputStyles =
  `
    h-12
    rounded-xl
    border-border/60
    bg-muted/30
    transition-all
    duration-200
    hover:border-border
    focus:bg-background
    focus-visible:outline-none
    focus-visible:ring-2
    focus-visible:ring-primary
    focus-visible:ring-offset-2
  `;

export const LoginForm: React.FC<
  LoginFormProps
> = ({
  onSubmit,
  onGoogleLogin,
}) => {
  const [isLoading, setIsLoading] =
    useState(false);

  const [serverError, setServerError] =
    useState<string | null>(null);

  const [showErrors, setShowErrors] =
    useState(false);

  const {
    fields,
    handleChange,
    handleBlur,
    validateAll,
    getFieldError,
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

  /*
   |--------------------------------------------------------------------------
   | Errors
   |--------------------------------------------------------------------------
   */

  const emailError = getFieldError(
    "email",
    showErrors
  );

  const passwordError = getFieldError(
    "password",
    showErrors
  );

  /*
   |--------------------------------------------------------------------------
   | Submit
   |--------------------------------------------------------------------------
   */

  const handleSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    setShowErrors(true);

    setServerError(null);

    if (!validateAll()) return;

    setIsLoading(true);

    try {
      await onSubmit({
        email: fields.email.value,

        password:
          fields.password.value,
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "No pudimos iniciar sesión con esas credenciales.";

      setServerError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogle = async () => {
    setIsLoading(true);

    try {
      await onGoogleLogin();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5"
      noValidate
    >
      {/* Server Error */}
      <div
        aria-live="assertive"
        role="alert"
      >
        {serverError && (
          <div
            className="
              animate-in
              slide-in-from-top-1
              fade-in-0
              rounded-xl
              border
              border-destructive/20
              bg-destructive/10
              px-4
              py-3
              text-sm
              text-destructive
            "
          >
            {serverError}
          </div>
        )}
      </div>

      {/* Email */}
      <div className="space-y-2">
        <label
          htmlFor="email"
          className="
            block
            text-xs
            font-medium
            uppercase
            tracking-wide
            text-muted-foreground
          "
        >
          Email
          <span aria-hidden="true">
            {" "}*
          </span>
        </label>

        <Input
          id="email"
          name="email"
          type="email"
          value={fields.email.value}
          onChange={handleChange}
          onBlur={() =>
            handleBlur("email")
          }
          error={emailError}
          placeholder="tu@email.com"
          disabled={isLoading}
          autoComplete="email"
          aria-invalid={!!emailError}
          aria-required="true"
          aria-describedby={
            emailError
              ? "email-error"
              : "email-help"
          }
          className={inputStyles}
        />

        {/* Help */}
        <p
          id="email-help"
          className="
            text-xs
            text-muted-foreground
          "
        >
          Ingresa el correo con el
          que creaste tu cuenta.
        </p>

        {/* Error */}
        <div
          id="email-error"
          aria-live="polite"
        >
          {emailError && (
            <span
              className="
                block
                text-xs
                text-destructive
              "
            >
              {emailError}
            </span>
          )}
        </div>
      </div>

      {/* Password */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label
            htmlFor="password"
            className="
              block
              text-xs
              font-medium
              uppercase
              tracking-wide
              text-muted-foreground
            "
          >
            Contraseña
            <span aria-hidden="true">
              {" "}*
            </span>
          </label>

          <button
            type="button"
            className="
              rounded-sm
              text-xs
              text-muted-foreground
              transition-colors
              hover:text-foreground
              focus-visible:outline-none
              focus-visible:ring-2
              focus-visible:ring-primary
            "
          >
            ¿Olvidaste tu contraseña?
          </button>
        </div>

        <Input
          id="password"
          name="password"
          type="password"
          value={fields.password.value}
          onChange={handleChange}
          onBlur={() =>
            handleBlur("password")
          }
          error={passwordError}
          placeholder="••••••••"
          disabled={isLoading}
          autoComplete="current-password"
          aria-invalid={
            !!passwordError
          }
          aria-required="true"
          aria-describedby={
            passwordError
              ? "password-error"
              : "password-help"
          }
          className={inputStyles}
        />

        {/* Help */}
        <p
          id="password-help"
          className="
            text-xs
            text-muted-foreground
          "
        >
          Tu contraseña debe tener al
          menos 6 caracteres.
        </p>

        {/* Error */}
        <div
          id="password-error"
          aria-live="polite"
        >
          {passwordError && (
            <span
              className="
                block
                text-xs
                text-destructive
              "
            >
              {passwordError}
            </span>
          )}
        </div>
      </div>

      {/* Submit */}
      <Button
        type="submit"
        variant="primary"
        isLoading={isLoading}
        disabled={isLoading}
        className="
          h-12
          w-full
          rounded-xl
          text-sm
          font-medium
          shadow-lg
          shadow-primary/20
          transition-all
          duration-200
          hover:brightness-110
          focus-visible:outline-none
          focus-visible:ring-2
          focus-visible:ring-primary
          focus-visible:ring-offset-2
        "
      >
        Iniciar sesión
      </Button>

      {/* Divider */}
      <div className="relative py-2">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border/60" />
        </div>

        <div className="relative flex justify-center">
          <span
            className="
              bg-card
              px-3
              text-xs
              text-muted-foreground
            "
          >
            o continúa con
          </span>
        </div>
      </div>

      {/* Google */}
      <GoogleSignInButton
        onSuccess={handleGoogle}
      />

      {/* Register */}
      <p
        className="
          pt-2
          text-center
          text-sm
          text-muted-foreground
        "
      >
        ¿No tienes cuenta?{" "}

        <a
          href="/register"
          className="
            rounded-sm
            font-medium
            text-foreground
            transition-colors
            hover:text-primary
            focus-visible:outline-none
            focus-visible:ring-2
            focus-visible:ring-primary
          "
        >
          Crear cuenta
        </a>
      </p>
    </form>
  );
};