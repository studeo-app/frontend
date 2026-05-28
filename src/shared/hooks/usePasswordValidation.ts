// hooks/usePasswordValidation.ts
import { useMemo } from "react";

export interface PasswordValidation {
  minLength: boolean;
  hasUppercase: boolean;
  hasNumber: boolean;
  isValid: boolean;
}

export function usePasswordValidation(password: string, confirmPassword: string = "") {
  const validation = useMemo(() => {
    const minLength = password.length >= 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const isValid = minLength && hasUppercase && hasNumber;

    return {
      minLength,
      hasUppercase,
      hasNumber,
      isValid,
    };
  }, [password]);

  const passwordsMatch = useMemo(() => {
    if (!confirmPassword) return true;
    return password === confirmPassword && password !== "";
  }, [password, confirmPassword]);

  return { validation, passwordsMatch };
}