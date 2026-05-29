import { useCallback, useState } from "react";
import {
  resolveAuthErrorMessage,
  type AuthErrorContext,
} from "../utils/firebaseAuthErrors";

/**
 * Estado y acciones compartidas para el ErrorModal en pantallas de auth.
 */
export function useAuthErrorModal() {
  const [isErrorOpen, setIsErrorOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const showAuthError = useCallback(
    (error: unknown, context: AuthErrorContext) => {
      setErrorMsg(resolveAuthErrorMessage(error, context));
      setIsErrorOpen(true);
    },
    []
  );

  const closeAuthError = useCallback(() => {
    setIsErrorOpen(false);
  }, []);

  return {
    isErrorOpen,
    errorMsg,
    showAuthError,
    closeAuthError,
  };
}
