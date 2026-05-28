
// components/auth/RegisterForm.tsx
import React, { useMemo, useState } from "react";

import { Input } from "@/shared/components/ui/Input";
import { Button } from "@/shared/components/ui/Button";

import { useForm } from "@/shared/hooks/useForm";
import { usePasswordValidation } from "@/shared/hooks/usePasswordValidation";

import { PasswordStrength } from "./PasswordStrength";

import GoogleSignInButton from "../components/GoogleSignInButton";

interface RegisterFormProps {
  onSubmit: (data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  }) => Promise<void>;

  onGoogleRegister: () => Promise<void>;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({
  onSubmit,
  onGoogleRegister,
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const [serverError, setServerError] = useState<string | null>(
    null
  );

  const [isPasswordFocused, setIsPasswordFocused] =
    useState(false);

  const {
    fields,
    handleChange,
    handleBlur,
    validateAll,
    getFieldError,
  } = useForm({
    firstName: {
      value: "",
      rules: {
        required: true,
      },
    },

    lastName: {
      value: "",
      rules: {
        required: true,
      },
    },

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
        minLength: 8,

        custom: (value) => {
          if (!/[A-Z]/.test(value)) {
            return "Debe incluir una mayúscula";
          }

          if (!/[0-9]/.test(value)) {
            return "Debe incluir un número";
          }

          return undefined;
        },
      },
    },

    confirmPassword: {
      value: "",
      rules: {
        required: true,

        custom: (value, formValues) => {
          if (value !== formValues?.password) {
            return "Las contraseñas no coinciden";
          }

          return undefined;
        },
      },
    },
  });

  const { validation, passwordsMatch } =
    usePasswordValidation(
      fields.password.value,
      fields.confirmPassword.value
    );

  /*
   |--------------------------------------------------------------------------
   | Realtime Validation
   |--------------------------------------------------------------------------
   */

  const firstNameError = getFieldError("firstName", true);

  const lastNameError = getFieldError("lastName", true);

  const emailError = getFieldError("email", true);

  const passwordError = getFieldError("password", true);

  const confirmPasswordError = getFieldError(
    "confirmPassword",
    true
  );

  /*
   |--------------------------------------------------------------------------
   | Password Strength Visibility
   |--------------------------------------------------------------------------
   */

  const shouldShowPasswordStrength =
    !!fields.password.value &&
    (!validation.isValid || isPasswordFocused);

  /*
   |--------------------------------------------------------------------------
   | Form Validity
   |--------------------------------------------------------------------------
   */

  const isFormValid = useMemo(() => {
    const hasRequiredFields =
      fields.firstName.value.trim() &&
      fields.lastName.value.trim() &&
      fields.email.value.trim() &&
      fields.password.value.trim() &&
      fields.confirmPassword.value.trim();

    const hasFieldErrors =
      firstNameError ||
      lastNameError ||
      emailError ||
      passwordError ||
      confirmPasswordError;

    return (
      hasRequiredFields &&
      !hasFieldErrors &&
      validation.isValid &&
      passwordsMatch
    );
  }, [
    fields,
    firstNameError,
    lastNameError,
    emailError,
    passwordError,
    confirmPasswordError,
    validation.isValid,
    passwordsMatch,
  ]);

  /*
   |--------------------------------------------------------------------------
   | Submit
   |--------------------------------------------------------------------------
   */

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setServerError(null);

    if (!validateAll()) return;

    if (!validation.isValid || !passwordsMatch) {
      return;
    }

    setIsLoading(true);

    try {
      await onSubmit({
        firstName: fields.firstName.value,
        lastName: fields.lastName.value,
        email: fields.email.value,
        password: fields.password.value,
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Error al crear la cuenta.";

      setServerError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  /*
   |--------------------------------------------------------------------------
   | Google Register
   |--------------------------------------------------------------------------
   */

  const handleGoogle = async () => {
    setIsLoading(true);

    try {
      await onGoogleRegister();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Server Error */}
      {serverError && (
        <div
          className="
            rounded-xl
            border
            border-destructive/20
            bg-destructive/10
            px-4
            py-3
            text-sm
            text-destructive
            animate-in
            fade-in-0
            slide-in-from-top-1
          "
        >
          {serverError}
        </div>
      )}

      {/* Names */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* First Name */}
        <div className="space-y-2">
          <label
            htmlFor="firstName"
            className="
              text-xs
              font-medium
              uppercase
              tracking-wide
              text-muted-foreground
            "
          >
            Nombre
          </label>

          <Input
            id="firstName"
            name="firstName"
            value={fields.firstName.value}
            onChange={handleChange}
            onBlur={() => handleBlur("firstName")}
            error={firstNameError}
            placeholder="Alex"
            disabled={isLoading}
            autoComplete="given-name"
            aria-invalid={!!firstNameError}
            className="
              h-12
              border-border/60
              bg-muted/30
              hover:border-border
              focus:bg-background
            "
          />
        </div>

        {/* Last Name */}
        <div className="space-y-2">
          <label
            htmlFor="lastName"
            className="
              text-xs
              font-medium
              uppercase
              tracking-wide
              text-muted-foreground
            "
          >
            Apellido
          </label>

          <Input
            id="lastName"
            name="lastName"
            value={fields.lastName.value}
            onChange={handleChange}
            onBlur={() => handleBlur("lastName")}
            error={lastNameError}
            placeholder="Rivera"
            disabled={isLoading}
            autoComplete="family-name"
            aria-invalid={!!lastNameError}
            className="
              h-12
              border-border/60
              bg-muted/30
              hover:border-border
              focus:bg-background
            "
          />
        </div>
      </div>

      {/* Email */}
      <div className="space-y-2">
        <label
          htmlFor="email"
          className="
            text-xs
            font-medium
            uppercase
            tracking-wide
            text-muted-foreground
          "
        >
          Email
        </label>

        <Input
          id="email"
          name="email"
          type="email"
          value={fields.email.value}
          onChange={handleChange}
          onBlur={() => handleBlur("email")}
          error={emailError}
          placeholder="usuario@universidad.edu"
          disabled={isLoading}
          autoComplete="email"
          aria-invalid={!!emailError}
          className="
            h-12
            border-border/60
            bg-muted/30
            hover:border-border
            focus:bg-background
          "
        />
      </div>

      {/* Password */}
      <div className="space-y-3">
        <label
          htmlFor="password"
          className="
            text-xs
            font-medium
            uppercase
            tracking-wide
            text-muted-foreground
          "
        >
          Contraseña
        </label>

        <Input
          id="password"
          name="password"
          type="password"
          value={fields.password.value}
          onChange={handleChange}
          onFocus={() => setIsPasswordFocused(true)}
          onBlur={() => {
            handleBlur("password");
            setIsPasswordFocused(false);
          }}
          error={passwordError}
          placeholder="••••••••"
          disabled={isLoading}
          autoComplete="new-password"
          aria-invalid={!!passwordError}
          className="
            h-12
            border-border/60
            bg-muted/30
            hover:border-border
            focus:bg-background
          "
        />

        {/* Password Strength */}
        <div
          className={`
            overflow-hidden
            transition-all
            duration-200
            ${
              shouldShowPasswordStrength
                ? "max-h-40 opacity-100"
                : "max-h-0 opacity-0"
            }
          `}
        >
          <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
            <PasswordStrength validation={validation} />
          </div>
        </div>
      </div>

      {/* Confirm Password */}
      <div className="space-y-2">
        <label
          htmlFor="confirmPassword"
          className="
            text-xs
            font-medium
            uppercase
            tracking-wide
            text-muted-foreground
          "
        >
          Confirmar contraseña
        </label>

        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          value={fields.confirmPassword.value}
          onChange={handleChange}
          onBlur={() => handleBlur("confirmPassword")}
          error={confirmPasswordError}
          placeholder="••••••••"
          disabled={isLoading}
          autoComplete="new-password"
          aria-invalid={!!confirmPasswordError}
          className="
            h-12
            border-border/60
            bg-muted/30
            hover:border-border
            focus:bg-background
          "
        />

        {fields.confirmPassword.value &&
          passwordsMatch &&
          fields.confirmPassword.value ===
            fields.password.value && (
            <div className="flex items-center gap-2 px-1 text-xs text-secondary">
              <svg
                className="h-3.5 w-3.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                />
              </svg>

              Las contraseñas coinciden
            </div>
          )}
      </div>

      {/* Submit */}
      <Button
        type="submit"
        variant="primary"
        disabled={!isFormValid || isLoading}
        isLoading={isLoading}
        className="
          h-12
          w-full
          rounded-xl
          text-sm
          font-medium
        "
      >
        Crear cuenta
      </Button>

      {/* Divider */}
      <div className="relative py-2">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border/60" />
        </div>

        <div className="relative flex justify-center">
          <span className="bg-card px-3 text-xs text-muted-foreground">
            o continúa con
          </span>
        </div>
      </div>

      {/* Google */}
      <GoogleSignInButton onClick={handleGoogle} />

      {/* Login */}
      <p className="pt-2 text-center text-sm text-muted-foreground">
        ¿Ya tienes cuenta?{" "}
        <a
          href="/login"
          className="
            font-medium
            text-foreground
            transition-colors
            hover:text-primary
          "
        >
          Iniciar sesión
        </a>
      </p>
    </form>
  );
};
