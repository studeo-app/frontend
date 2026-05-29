import { useCallback, useState } from "react";
import {
  getCompleteProfileErrorTitle,
  resolveCompleteProfileErrorMessage,
} from "../utils/completeProfileErrors";

export function useCompleteProfileErrorModal() {
  const [isErrorOpen, setIsErrorOpen] = useState(false);
  const [errorTitle, setErrorTitle] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const showProfileError = useCallback((error: unknown, title?: string) => {
    setErrorMsg(resolveCompleteProfileErrorMessage(error));
    setErrorTitle(title ?? getCompleteProfileErrorTitle(error));
    setIsErrorOpen(true);
  }, []);

  const showProfileErrorMessage = useCallback(
    (message: string, title = "No pudimos completar tu perfil") => {
      setErrorMsg(message);
      setErrorTitle(title);
      setIsErrorOpen(true);
    },
    []
  );

  const closeProfileError = useCallback(() => {
    setIsErrorOpen(false);
  }, []);

  return {
    isErrorOpen,
    errorTitle,
    errorMsg,
    showProfileError,
    showProfileErrorMessage,
    closeProfileError,
  };
}
