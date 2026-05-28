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

export const LoginForm: React.FC<LoginFormProps> = ({
  onSubmit,
  onGoogleLogin,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [showErrors, setShowErrors] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setShowErrors(true);
    setServerError(null);

    if (!validateAll()) return;

    setIsLoading(true);

    try {
      await onSubmit({
        email: fields.email.value,
        password: fields.password.value,
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
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Error */}
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
          error={getFieldError("email", showErrors)}
          placeholder="tu@email.com"
          disabled={isLoading}
          autoComplete="email"
          aria-invalid={!!getFieldError("email", showErrors)}
          className="
            h-12
            border-border/60
            bg-muted/30
            transition-all
            duration-200
            hover:border-border
            focus:bg-background
          "
        />
      </div>

      {/* Password */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
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

          <button
            type="button"
            className="
              text-xs
              text-muted-foreground
              transition-colors
              hover:text-foreground
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
          onBlur={() => handleBlur("password")}
          error={getFieldError("password", showErrors)}
          placeholder="••••••••"
          disabled={isLoading}
          autoComplete="current-password"
          aria-invalid={!!getFieldError("password", showErrors)}
          className="
            h-12
            border-border/60
            bg-muted/30
            transition-all
            duration-200
            hover:border-border
            focus:bg-background
          "
        />
      </div>

      {/* Submit */}
      <Button
        type="submit"
        variant="primary"
        isLoading={isLoading}
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
          <span className="bg-card px-3 text-xs text-muted-foreground">
            o continúa con
          </span>
        </div>
      </div>

      {/* Google */}
      <GoogleSignInButton onSuccess={handleGoogle} />

      {/* Register */}
      <p className="pt-2 text-center text-sm text-muted-foreground">
        ¿No tienes cuenta?{" "}
        <a
          href="/register"
          className="
            font-medium
            text-foreground
            transition-colors
            hover:text-primary
          "
        >
          Crear cuenta
        </a>
      </p>
    </form>
  );
};
