import { useState } from "react";
import GoogleIcon from "./GoogleIcon";
import { authClasses } from "../theme/authTheme";

interface GoogleSignInButtonProps {
  onSignIn: () => Promise<void>;
  disabled?: boolean;
}

export default function GoogleSignInButton({
  onSignIn,
  disabled = false,
}: GoogleSignInButtonProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);

    try {
      await onSignIn();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleGoogleSignIn}
      disabled={disabled || isSubmitting}
      className={`${authClasses.btnGoogle} inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl text-sm transition-all duration-200 disabled:pointer-events-none disabled:opacity-50`}
    >
      {isSubmitting ? (
        <svg
          className="h-4 w-4 animate-spin text-auth-google-text"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-80"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.37 0 0 5.37 0 12h4z"
          />
        </svg>
      ) : (
        <GoogleIcon className="mr-1 h-4 w-4 shrink-0" />
      )}
      Continuar con Google
    </button>
  );
}
