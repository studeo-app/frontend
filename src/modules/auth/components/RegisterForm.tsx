// components/auth/RegisterForm.tsx
import React, { useMemo, useState } from "react";

import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";

import { useForm } from "@/shared/hooks/useForm";
import { usePasswordValidation } from "@/shared/hooks/usePasswordValidation";

import GoogleSignInButton from "./GoogleSignInButton";

interface RegisterFormProps {
  onSubmit: (data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  }) => Promise<void>;

  onGoogleRegister: () => Promise<void>;
}

export const RegisterForm: React.FC<
  RegisterFormProps
> = ({
  onSubmit,
  onGoogleRegister,
}) => {
  const [isLoading, setIsLoading] =
    useState(false);

  const [serverError, setServerError] =
    useState<string | null>(null);

  const [passwordFocused, setPasswordFocused] =
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
      rules: { required: true },
    },

    lastName: {
      value: "",
      rules: { required: true },
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

        custom: (
          value,
          formValues
        ) => {
          if (
            value !== formValues?.password
          ) {
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
   | Validation
   |--------------------------------------------------------------------------
   */

  const passwordRequirementsVisible =
    fields.password.value &&
    (
      passwordFocused ||
      !validation.isValid
    );

  const confirmSuccess =
    fields.confirmPassword.value &&
    passwordsMatch &&
    fields.confirmPassword.value ===
      fields.password.value;

  const isFormValid = useMemo(() => {
    return (
      fields.firstName.value.trim() &&
      fields.lastName.value.trim() &&
      fields.email.value.trim() &&
      validation.isValid &&
      passwordsMatch
    );
  }, [
    fields,
    validation.isValid,
    passwordsMatch,
  ]);

  /*
   |--------------------------------------------------------------------------
   | Submit
   |--------------------------------------------------------------------------
   */

  const handleSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    setServerError(null);

    if (
      !validateAll() ||
      !validation.isValid ||
      !passwordsMatch
    ) {
      return;
    }

    setIsLoading(true);

    try {
      await onSubmit({
        firstName:
          fields.firstName.value,

        lastName:
          fields.lastName.value,

        email: fields.email.value,

        password:
          fields.password.value,
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

  const handleGoogle = async () => {
    setIsLoading(true);

    try {
      await onGoogleRegister();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-2"
    >
      {/* Error */}
      {serverError && (
        <div
          className="
            rounded-2xl
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

      {/* Google */}
      <GoogleSignInButton onClick={handleGoogle} />

      {/* Divider */}
      <div className="relative">
        <div
          className="
            absolute
            inset-0
            flex
            items-center
          "
        >
          <div className="w-full border-t border-border/60" />
        </div>

        <div
          className="
            relative
            flex
            justify-center
          "
        >
          <span
            className="
              bg-background
              px-4
              text-xs
              uppercase
              tracking-[0.2em]
              text-muted-foreground
            "
          >
            o
          </span>
        </div>
      </div>

      {/* Names */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label
            htmlFor="firstName"
            className="
              block
              px-1
              text-[11px]
              font-medium
              uppercase
              tracking-[0.2em]
              text-muted-foreground
            "
          >
            Nombres
          </label>

          <Input
            id="firstName"
            name="firstName"
            value={fields.firstName.value}
            onChange={handleChange}
            onBlur={() =>
              handleBlur("firstName")
            }
            error={getFieldError(
              "firstName",
              true
            )}
            placeholder="Ej. Alex"
            disabled={isLoading}
            autoComplete="given-name"
            className="
              h-8
              rounded-2xl
              border-border/60
              bg-card/40
              backdrop-blur-sm
            "
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="lastName"
            className="
              block
              px-1
              text-[11px]
              font-medium
              uppercase
              tracking-[0.2em]
              text-muted-foreground
            "
          >
            Apellidos
          </label>

          <Input
            id="lastName"
            name="lastName"
            value={fields.lastName.value}
            onChange={handleChange}
            onBlur={() =>
              handleBlur("lastName")
            }
            error={getFieldError(
              "lastName",
              true
            )}
            placeholder="Ej. Rivera"
            disabled={isLoading}
            autoComplete="family-name"
            className="
              h-8
              rounded-2xl
              border-border/60
              bg-card/40
              backdrop-blur-sm
            "
          />
        </div>
      </div>

      {/* Email */}
      <div className="space-y-2">
        <label
          htmlFor="email"
          className="
            block
            px-1
            text-[11px]
            font-medium
            uppercase
            tracking-[0.2em]
            text-muted-foreground
          "
        >
          Correo electrónico
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
          error={getFieldError(
            "email",
            true
          )}
          placeholder="usuario@universidad.edu"
          disabled={isLoading}
          autoComplete="email"
          className="
            h-8
            rounded-2xl
            border-border/60
            bg-card/40
            backdrop-blur-sm
          "
        />
      </div>

      {/* Password */}
      <div className="space-y-2">
        <label
          htmlFor="password"
          className="
            block
            px-1
            text-[11px]
            font-medium
            uppercase
            tracking-[0.2em]
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
          onBlur={() => {
            handleBlur("password");
            setPasswordFocused(false);
          }}
          onFocus={() =>
            setPasswordFocused(true)
          }
          placeholder="********"
          disabled={isLoading}
          autoComplete="new-password"
          className="
            h-8
            rounded-2xl
            border-border/60
            bg-card/40
            backdrop-blur-sm
          "
        />

        {/* Password Rules */}
        <div
          className={`
            overflow-hidden
            transition-all
            duration-300
            ${
              passwordRequirementsVisible
                ? "max-h-40 opacity-100"
                : "max-h-0 opacity-0"
            }
          `}
        >
          <div className="space-y-1 px-1">
            <PasswordRule
              valid={
                validation.hasMinLength
              }
              text="Mínimo 8 caracteres"
            />

            <PasswordRule
              valid={
                validation.hasUppercase
              }
              text="Incluye una mayúscula"
            />

            <PasswordRule
              valid={validation.hasNumber}
              text="Incluye un número"
            />
          </div>
        </div>
      </div>

      {/* Confirm Password */}
      <div className="space-y-2">
        <label
          htmlFor="confirmPassword"
          className="
            block
            px-1
            text-[11px]
            font-medium
            uppercase
            tracking-[0.2em]
            text-muted-foreground
          "
        >
          Confirmar contraseña
        </label>

        <div className="relative">
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            value={
              fields.confirmPassword.value
            }
            onChange={handleChange}
            onBlur={() =>
              handleBlur(
                "confirmPassword"
              )
            }
            error={getFieldError(
              "confirmPassword",
              true
            )}
            placeholder="********"
            disabled={isLoading}
            autoComplete="new-password"
            className={`
              h-8
              rounded-2xl
              border-border/60
              bg-card/40
              pr-12
              backdrop-blur-sm
              ${
                confirmSuccess
                  ? "!border-secondary focus:!ring-secondary"
                  : ""
              }
            `}
          />

          {confirmSuccess && (
            <div
              className="
                pointer-events-none
                absolute
                right-4
                top-1/2
                -translate-y-1/2
                text-secondary
              "
            >
              <svg
                className="h-5 w-5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                />
              </svg>
            </div>
          )}
        </div>

        {/* Success */}
        <div
          className={`
            overflow-hidden
            transition-all
            duration-200
            ${
              confirmSuccess
                ? "max-h-10 opacity-100"
                : "max-h-0 opacity-0"
            }
          `}
        >
          <div
            className="
              flex
              items-center
              gap-2
              px-1
              text-xs
              text-secondary
            "
          >
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
        </div>
      </div>

      {/* Submit */}
      <Button
        type="submit"
        variant="primary"
        disabled={!isFormValid || isLoading}
        isLoading={isLoading}
        className="
          h-10
          w-full
          rounded-2xl
          text-base
          font-semibold
          shadow-lg
          shadow-primary/20
          cursor-pointer
        "
      >
        Crear cuenta
      </Button>

      {/* Login */}
      <p
        className="
          text-center
          text-sm
          text-muted-foreground
        "
      >
        ¿Ya tienes una cuenta?{" "}
        <a
          href="/login"
          className="
            font-medium
            text-secondary
            transition-colors
            hover:text-secondary/80
          "
        >
          Iniciar Sesión
        </a>
      </p>
    </form>
  );
};

/*
|--------------------------------------------------------------------------
| Password Rule
|--------------------------------------------------------------------------
*/

interface PasswordRuleProps {
  valid: boolean;
  text: string;
}

const PasswordRule: React.FC<
  PasswordRuleProps
> = ({
  valid,
  text,
}) => {
  return (
    <div
      className={`
        flex
        items-center
        gap-2
        text-xs
        transition-colors
        ${
          valid
            ? "text-secondary"
            : "text-muted-foreground"
        }
      `}
    >
      <svg
        className="h-3.5 w-3.5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M5 13l4 4L19 7"
        />
      </svg>

      {text}
    </div>
  );
};