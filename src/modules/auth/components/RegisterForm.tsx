import React, { useMemo, useState } from "react";

import { Input } from "@/shared/components/ui/Input";

import { useForm } from "@/shared/hooks/useForm";
import { usePasswordValidation } from "@/shared/hooks/usePasswordValidation";

import GoogleSignInButton from "./GoogleSignInButton";
import { authClasses, authInputClass } from "../theme/authTheme";

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

  const [showErrors, setShowErrors] =
    useState(false);

  const [passwordFocused, setPasswordFocused] =
    useState(false);

  const {
    fields,
    handleChange,
    handleBlur,
    validateAll,
    getFieldError,
    shouldShowFieldError,
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

  const {
    validation,
    passwordsMatch,
  } = usePasswordValidation(
    fields.password.value,
    fields.confirmPassword.value
  );

  /*
   |--------------------------------------------------------------------------
   | Errors
   |--------------------------------------------------------------------------
   */

  const firstNameError =
    getFieldError("firstName", showErrors);

  const lastNameError =
    getFieldError("lastName", showErrors);

  const emailError =
    getFieldError("email", showErrors);

  const passwordError =
    getFieldError("password", showErrors);

  const confirmPasswordError =
    getFieldError("confirmPassword", showErrors);

  const emailInvalid = shouldShowFieldError(
    "email",
    showErrors
  ) && !!emailError;

  const firstNameInvalid = shouldShowFieldError(
    "firstName",
    showErrors
  ) && !!firstNameError;

  const lastNameInvalid = shouldShowFieldError(
    "lastName",
    showErrors
  ) && !!lastNameError;

  const passwordInvalid = shouldShowFieldError(
    "password",
    showErrors
  ) && !!passwordError;
  const confirmPasswordInvalid = shouldShowFieldError(
    "confirmPassword",
    showErrors
  ) && !!confirmPasswordError;

  /*
   |--------------------------------------------------------------------------
   | Validation
   |--------------------------------------------------------------------------
   */

  const passwordRequirementsVisible =
    !!fields.password.value &&
    (
      passwordFocused ||
      !validation.isValid
    );

  const confirmSuccess =
    !!fields.confirmPassword.value &&
    passwordsMatch &&
    fields.confirmPassword.value ===
      fields.password.value;

  const isFormValid = useMemo(() => {
    return (
      fields.firstName.value.trim() &&
      fields.lastName.value.trim() &&
      fields.email.value.trim() &&
      validation.isValid &&
      passwordsMatch &&
      !firstNameError &&
      !lastNameError &&
      !emailError &&
      !passwordError &&
      !confirmPasswordError
    );
  }, [
    fields,
    validation.isValid,
    passwordsMatch,
    firstNameError,
    lastNameError,
    emailError,
    passwordError,
    confirmPasswordError,
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

    setShowErrors(true);

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
    } catch {
      // El modal de error lo muestra RegisterPage
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4"
      noValidate
    >

      {/* Google */}
      <GoogleSignInButton
        onSignIn={onGoogleRegister}
        disabled={isLoading}
      />

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className={authClasses.dividerLine} />
        </div>
        <div className="relative flex justify-center">
          <span className={authClasses.dividerText}>o</span>
        </div>
      </div>

      {/* Names */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* First Name */}
        <div className={authClasses.field}>
          <label htmlFor="firstName" className={authClasses.label}>
            Nombres
            <span aria-hidden="true"> *</span>
          </label>

          <Input
            id="firstName"
            name="firstName"
            value={fields.firstName.value}
            onChange={handleChange}
            onBlur={() => handleBlur("firstName")}
            placeholder="Ej. Alex"
            disabled={isLoading}
            autoComplete="given-name"
            aria-invalid={firstNameInvalid}
            aria-required="true"
            aria-describedby={
              firstNameError ? "firstName-error" : undefined
            }
            className={authInputClass({ invalid: firstNameInvalid })}
          />

          {firstNameError && (
            <p id="firstName-error" className={authClasses.errorText} role="alert">
              {firstNameError}
            </p>
          )}
        </div>

        {/* Last Name */}
        <div className={authClasses.field}>
          <label htmlFor="lastName" className={authClasses.label}>
            Apellidos
            <span aria-hidden="true"> *</span>
          </label>

          <Input
            id="lastName"
            name="lastName"
            value={fields.lastName.value}
            onChange={handleChange}
            onBlur={() => handleBlur("lastName")}
            placeholder="Ej. Rivera"
            disabled={isLoading}
            autoComplete="family-name"
            aria-invalid={lastNameInvalid}
            aria-required="true"
            aria-describedby={
              lastNameError ? "lastName-error" : undefined
            }
            className={authInputClass({ invalid: lastNameInvalid })}
          />

          {lastNameError && (
            <p id="lastName-error" className={authClasses.errorText} role="alert">
              {lastNameError}
            </p>
          )}
        </div>
      </div>

      {/* Email */}
      <div className={authClasses.field}>
        <label htmlFor="email" className={authClasses.label}>
          Correo electrónico
          <span aria-hidden="true"> *</span>
        </label>

        <Input
          id="email"
          name="email"
          type="email"
          value={fields.email.value}
          onChange={handleChange}
          onBlur={() => handleBlur("email")}
          placeholder="usuario@universidad.edu"
          disabled={isLoading}
          autoComplete="email"
          aria-invalid={emailInvalid}
          aria-required="true"
          aria-describedby={emailError ? "email-error" : undefined}
          className={authInputClass({ invalid: emailInvalid })}
        />

        {emailError && (
          <p id="email-error" className={authClasses.errorText} role="alert">
            {emailError}
          </p>
        )}
      </div>

      {/* Password */}
      <div className={authClasses.field}>
        <label htmlFor="password" className={authClasses.label}>
          Contraseña
          <span aria-hidden="true"> *</span>
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
          onFocus={() => setPasswordFocused(true)}
          placeholder="********"
          disabled={isLoading}
          autoComplete="new-password"
          aria-invalid={passwordInvalid}
          aria-required="true"
          aria-describedby={
            passwordError
              ? "password-error password-rules"
              : "password-rules"
          }
          className={authInputClass({ invalid: passwordInvalid })}
        />

        {passwordError && (
          <p id="password-error" className={authClasses.errorText} role="alert">
            {passwordError}
          </p>
        )}

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
          <div
            id="password-rules"
            className="space-y-1 px-1"
          >
            <PasswordRule
              valid={
                validation.minLength
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
              valid={
                validation.hasNumber
              }
              text="Incluye un número"
            />
          </div>
        </div>
      </div>

      {/* Confirm Password */}
      <div className={authClasses.field}>
        <label htmlFor="confirmPassword" className={authClasses.label}>
          Confirmar contraseña
          <span aria-hidden="true"> *</span>
        </label>

        <div className="relative">
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            value={fields.confirmPassword.value}
            onChange={handleChange}
            onBlur={() => handleBlur("confirmPassword")}
            placeholder="********"
            disabled={isLoading}
            autoComplete="new-password"
            aria-invalid={confirmPasswordInvalid}
            aria-required="true"
            aria-describedby={
              confirmPasswordError
                ? "confirmPassword-error"
                : confirmSuccess
                  ? "confirmPassword-success"
                  : undefined
            }
            className={authInputClass({
              invalid: confirmPasswordInvalid,
              extra: `pr-12 ${confirmSuccess ? "auth-confirm-success" : ""}`,
            })}
          />

          {confirmSuccess && (
            <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-auth-link">
              <svg
                className="h-5 w-5"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
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

        {confirmPasswordError && (
          <p
            id="confirmPassword-error"
            className={authClasses.errorText}
            role="alert"
          >
            {confirmPasswordError}
          </p>
        )}

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
            id="confirmPassword-success"
            className="flex items-center gap-2 px-1 text-xs text-auth-link"
          >
            <svg
              className="h-3.5 w-3.5"
              fill="currentColor"
              viewBox="0 0 20 20"
              aria-hidden="true"
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
      <button
        type="submit"
        disabled={!isFormValid || isLoading}
        className={`${authClasses.btnPrimary} flex h-10 w-full items-center justify-center rounded-2xl text-base transition-all duration-200 disabled:pointer-events-none disabled:opacity-50`}
      >
        {isLoading ? "Creando cuenta…" : "Crear cuenta"}
      </button>

      <p className={`${authClasses.subtitle} text-center text-sm`}>
        ¿Ya tienes una cuenta?{" "}
        <a href="/login" className={authClasses.link}>
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
      className={`flex items-center gap-2 text-xs transition-colors ${
        valid ? authClasses.ruleValid : authClasses.ruleInvalid
      }`}
    >
      <svg
        className="h-3.5 w-3.5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden="true"
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