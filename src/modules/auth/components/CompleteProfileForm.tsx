import React, { useMemo, useState } from "react";

import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";

import { useForm } from "@/shared/hooks/useForm";

interface CompleteProfileFormProps {
  defaultUsername?: string;

  onSubmit: (data: {
    username: string;
  }) => Promise<void>;
}

const inputStyles =
  "h-14 w-full rounded-2xl border-border/60 bg-card/40 pl-10 backdrop-blur-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2";

export const CompleteProfileForm: React.FC<
  CompleteProfileFormProps
> = ({
  defaultUsername = "",
  onSubmit,
}) => {
  const [isLoading, setIsLoading] =
    useState(false);

  const [serverError, setServerError] =
    useState<string | null>(null);

  const {
    fields,
    handleChange,
    handleBlur,
    validateAll,
    getFieldError,
  } = useForm({
    username: {
      value: defaultUsername,

      rules: {
        required: true,
        minLength: 3,

        custom: (value) => {
          if (
            !/^[a-zA-Z0-9_]+$/.test(value)
          ) {
            return "Solo letras, números y guiones bajos";
          }

          return undefined;
        },
      },
    },
  });

  /*
   |--------------------------------------------------------------------------
   | Errors
   |--------------------------------------------------------------------------
   */

  const usernameError =
    getFieldError("username", true);

  /*
   |--------------------------------------------------------------------------
   | Validation
   |--------------------------------------------------------------------------
   */

  const usernameAvailable =
    fields.username.value.length >= 3 &&
    !usernameError;

  const isFormValid = useMemo(() => {
    return (
      fields.username.value.trim() &&
      !usernameError
    );
  }, [
    fields.username.value,
    usernameError,
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

    if (!validateAll()) return;

    setIsLoading(true);

    try {
      await onSubmit({
        username: fields.username.value,
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "No pudimos completar tu perfil.";

      setServerError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-8"
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

      {/* Username */}
      <div className="space-y-3">
        <label
          htmlFor="username"
          className="
            block
            px-1
            text-xs
            font-medium
            uppercase
            tracking-wider
            text-muted-foreground
          "
        >
          Username
          <span aria-hidden="true">
            {" "}*
          </span>
        </label>

        <div className="relative flex items-center">
          {/* Prefix */}
          <div
            className="
              pointer-events-none
              absolute
              left-4
              text-sm
              text-muted-foreground
            "
            aria-hidden="true"
          >
            @
          </div>

          <Input
            id="username"
            name="username"
            value={fields.username.value}
            onChange={handleChange}
            onBlur={() =>
              handleBlur("username")
            }
            error={usernameError}
            placeholder="tu_username"
            disabled={isLoading}
            autoComplete="username"
            aria-invalid={
              !!usernameError
            }
            aria-required="true"
            aria-describedby={
              usernameError
                ? "username-error"
                : usernameAvailable
                ? "username-success"
                : "username-help"
            }
            className={inputStyles}
          />

          {/* Success Icon */}
          {usernameAvailable && (
            <div
              className="
                pointer-events-none
                absolute
                right-4
                top-1/2
                flex
                -translate-y-1/2
                items-center
                justify-center
                text-secondary
              "
            >
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

        {/* Help Text */}
        <p
          id="username-help"
          className="
            px-1
            text-xs
            text-muted-foreground
          "
        >
          Usa mínimo 3 caracteres.
          Solo letras, números y "_".
        </p>

        {/* Error */}
        <div
          id="username-error"
          aria-live="polite"
        >
          {usernameError && (
            <span
              className="
                block
                px-1
                text-xs
                text-destructive
              "
            >
              {usernameError}
            </span>
          )}
        </div>

        {/* Success */}
        <div
          className={`
            overflow-hidden
            transition-all
            duration-200
            ${
              usernameAvailable
                ? "max-h-10 opacity-100"
                : "max-h-0 opacity-0"
            }
          `}
        >
          <div
            id="username-success"
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
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              />
            </svg>

            Username disponible
          </div>
        </div>
      </div>

      {/* Submit */}
      <Button
        type="submit"
        variant="primary"
        disabled={
          !isFormValid || isLoading
        }
        isLoading={isLoading}
        className="
          h-14
          w-full
          rounded-2xl
          text-base
          font-semibold
          focus-visible:outline-none
          focus-visible:ring-2
          focus-visible:ring-primary
          focus-visible:ring-offset-2
        "
      >
        Completar registro

        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M13 7l5 5m0 0l-5 5m5-5H6"
          />
        </svg>
      </Button>
    </form>
  );
};