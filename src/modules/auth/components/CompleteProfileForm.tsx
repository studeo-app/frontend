import React, { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";

import { Input } from "@/shared/components/ui/Input";
import { ErrorModal } from "@/shared/components/ui/ErrorModal";

import { useForm } from "@/shared/hooks/useForm";
import { useCompleteProfileErrorModal } from "../hooks/useCompleteProfileErrorModal";
import { useUsernameAvailability } from "../hooks/useUsernameAvailability";
import { ProfileAvatarCarousel } from "./ProfileAvatarCarousel";
import { authClasses, authInputClass } from "../theme/authTheme";
import type { AuthProvider } from "@/types/user";

interface CompleteProfileFormProps {
  authProvider: AuthProvider;
  displayName: string;
  email: string;
  userId?: string;
  defaultUsername?: string;
  defaultAvatarUrl?: string;

  onSubmit: (data: {
    username: string;
    avatarUrl?: string;
  }) => Promise<void>;
}

export const CompleteProfileForm: React.FC<CompleteProfileFormProps> = ({
  authProvider,
  displayName,
  email,
  userId,
  defaultUsername = "",
  defaultAvatarUrl = "",
  onSubmit,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const lastUsernameCheckError = useRef<string | null>(null);

  const {
    isErrorOpen,
    errorTitle,
    errorMsg,
    showProfileError,
    showProfileErrorMessage,
    closeProfileError,
  } = useCompleteProfileErrorModal();
  const initialExternalUrl =
    authProvider === "google" ? defaultAvatarUrl : undefined;

  const {
    fields,
    handleBlur,
    validateAll,
    getFieldError,
    shouldShowFieldError,
    setFieldValue,
  } = useForm({
    username: {
      value: defaultUsername,
      rules: {
        required: true,
        minLength: 3,
        custom: (value) => {
          if (!/^[a-zA-Z0-9_]+$/.test(value)) {
            return "Solo letras, números y guiones bajos";
          }
          return undefined;
        },
      },
    },
    avatarUrl: {
      value: defaultAvatarUrl,
      rules: {
        required: true,
        custom: (value) => {
          if (!value.trim()) {
            return "Debes elegir una foto de perfil";
          }
          return undefined;
        },
      },
    },
  });

  const usernameError = getFieldError("username", showErrors);
  const avatarError = getFieldError("avatarUrl", showErrors);

  const usernameInvalid =
    shouldShowFieldError("username", showErrors) && !!usernameError;

  const usernameFormatValid =
    fields.username.value.trim().length >= 3 && !usernameError;

  const { checking, available, error: usernameCheckError } =
    useUsernameAvailability(fields.username.value, usernameFormatValid);

  useEffect(() => {
    if (!usernameCheckError || usernameCheckError === lastUsernameCheckError.current) {
      return;
    }
    lastUsernameCheckError.current = usernameCheckError;
    showProfileError(new Error(usernameCheckError), "Problema de conexión");
  }, [usernameCheckError, showProfileError]);

  useEffect(() => {
    if (!usernameCheckError) {
      lastUsernameCheckError.current = null;
    }
  }, [usernameCheckError]);

  const usernameConfirmed =
    usernameFormatValid && available === true && !checking;

  const hasAvatar = Boolean(fields.avatarUrl.value.trim());

  const isFormValid = useMemo(() => {
    return usernameConfirmed && hasAvatar && !avatarError;
  }, [usernameConfirmed, hasAvatar, avatarError]);

  const handleAvatarChange = ({ secureUrl }: { secureUrl: string }) => {
    setFieldValue("avatarUrl", secureUrl);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowErrors(true);

    if (!validateAll() || !isFormValid) {
      if (available === false) {
        showProfileErrorMessage(
          "Este nombre de usuario ya está en uso. Elige otro.",
          "Nombre de usuario no disponible"
        );
      }
      return;
    }

    setIsLoading(true);

    try {
      const avatarUrl = fields.avatarUrl.value.trim();

      await onSubmit({
        username: fields.username.value.trim().toLowerCase(),
        avatarUrl: avatarUrl || undefined,
      });
    } catch (err) {
      showProfileError(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4"
      noValidate
    >
      <ProfileAvatarCarousel
        displayName={displayName}
        userId={userId}
        initialExternalUrl={initialExternalUrl}
        value={fields.avatarUrl.value}
        disabled={isLoading}
        onChange={handleAvatarChange}
      />

          <div
        id="avatar-error"
        aria-live="polite"
      >
        {avatarError && (
          <p
            className={`${authClasses.errorText} -mt-2 text-center`}
            role="alert"
          >
            {avatarError}
          </p>
        )}
      </div>

      <div className="text-center">
        <p className={`${authClasses.title} text-xl font-semibold`}>
          {displayName}
        </p>
        <p className={`${authClasses.subtitle} text-base`}>{email}</p>
      </div>

      <div className={authClasses.field}>
        <label
          htmlFor="username"
          className={`${authClasses.label} text-xs uppercase tracking-wider`}
        >
          Nombre de usuario
          <span aria-hidden="true"> *</span>
        </label>

        <div className="relative flex items-center">
          <div
            className="pointer-events-none absolute left-4 text-sm text-auth-label"
            aria-hidden="true"
          >
            @
          </div>

        <Input
          id="username"
          name="username"
          value={fields.username.value}
          onChange={(e) =>
            setFieldValue(
              "username",
              e.target.value.toLowerCase()
            )
          }
          onBlur={() => handleBlur("username")}
          placeholder="tu_username"
          disabled={isLoading}
          autoComplete="username"
          aria-invalid={usernameInvalid}
          aria-required="true"
          aria-describedby={
            usernameError
              ? "username-error"
              : available === false
              ? "username-unavailable"
              : usernameConfirmed
              ? "username-success"
              : checking
              ? "username-checking"
              : undefined
          }
          className={authInputClass({
            invalid: usernameInvalid,
            extra:
              "h-[3.25rem] pl-10 rounded-2xl text-base",
          })}
        />
        </div>

        <div
        id="username-error"
        aria-live="polite"
      >
        {usernameError && (
          <p
            className={authClasses.errorText}
            role="alert"
          >
            {usernameError}
          </p>
        )}
      </div>

      {checking && usernameFormatValid && (
        <p
          id="username-checking"
          className={`${authClasses.helpText} text-auth-label`}
          aria-live="polite"
        >
          Verificando disponibilidad…
        </p>
      )}

        {usernameCheckError && (
          <p className={authClasses.errorText}>{usernameCheckError}</p>
        )}

        {!usernameError && available === false && (
          <p
            id="username-unavailable"
            className={authClasses.errorText}
            role="alert"
          >
            Este username ya está en uso.
          </p>
        )}

        {usernameConfirmed && (
          <p
            id="username-success"
            className={`${authClasses.helpText} ${authClasses.ruleValid}`}
            aria-live="polite"
          >
            Username disponible
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={!isFormValid || isLoading}
        aria-disabled={!isFormValid || isLoading}
        aria-busy={isLoading}
        className={`${authClasses.btnPrimary} flex h-[3.25rem] w-full items-center justify-center gap-2 rounded-2xl text-base transition-all duration-200 disabled:pointer-events-none disabled:opacity-50`}
      >
        {isLoading ? (
          "Guardando…"
        ) : (
          <>
            Completar registro
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </>
        )}
      </button>

      <ErrorModal
        isOpen={isErrorOpen}
        onClose={closeProfileError}
        title={errorTitle}
        message={errorMsg}
      />
    </form>
  );
};
