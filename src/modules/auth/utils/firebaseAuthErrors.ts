import { ApiError, getApiErrorMessage } from "@/shared/api/apiError";

/** Códigos de error documentados por Firebase Auth */
export const FIREBASE_AUTH_ERROR_MESSAGES: Record<string, string> = {
  // Credenciales / sesión (email)
  "auth/invalid-credential":
    "El correo electrónico o la contraseña son incorrectos.",
  "auth/invalid-email": "El formato del correo electrónico no es válido.",
  "auth/user-disabled":
    "Esta cuenta ha sido suspendida. Contacta al soporte técnico.",
  "auth/user-not-found": "No existe una cuenta con este correo electrónico.",
  "auth/wrong-password": "La contraseña es incorrecta.",
  "auth/too-many-requests":
    "Demasiados intentos fallidos. La cuenta se ha bloqueado temporalmente. Inténtalo de nuevo más tarde o restablece tu contraseña.",

  // Registro (email)
  "auth/email-already-in-use":
    "Ya existe una cuenta con este correo. Ya puedes iniciar sesión.",
  "auth/weak-password":
    "La contraseña es demasiado insegura. Intenta una más fuerte con al menos 8 caracteres, una mayúscula y un número.",
  "auth/operation-not-allowed":
    "El registro con correo y contraseña no está habilitado. Contacta al soporte.",

  // Google / proveedores
  "auth/popup-closed-by-user":
    "El inicio de sesión/registro fue cancelado.",
  "auth/popup-blocked":
    "El navegador bloqueó la ventana emergente. Permite ventanas emergentes para este sitio.",
  "auth/cancelled-popup-request":
    "Se canceló la ventana de inicio de sesión. Inténtalo de nuevo.",
  "auth/account-exists-with-different-credential":
    "Ya existe una cuenta con este correo usando otro proveedor. Prueba iniciando sesión con tu correo y contraseña.",
  "auth/credential-already-in-use":
    "Esta credencial ya está asociada a otra cuenta.",

  // Red / genéricos
  "auth/network-request-failed":
    "Ocurrió un error de red. Revisa tu conexión.",
  "auth/internal-error":
    "Ocurrió un error interno. Inténtalo de nuevo en unos momentos.",
  "auth/invalid-api-key":
    "Error de configuración del servicio. Contacta al soporte.",
};

export type AuthErrorContext = "login-email" | "register-email" | "google";

const CONTEXT_FALLBACKS: Record<AuthErrorContext, string> = {
  "login-email": "Ocurrió un error inesperado al iniciar sesión.",
  "register-email": "Ocurrió un error inesperado al registrar tu cuenta.",
  google: "Error al iniciar sesión con Google.",
};

interface FirebaseAuthErrorLike {
  code: string;
  message?: string;
}

export function isFirebaseAuthError(
  error: unknown
): error is FirebaseAuthErrorLike {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const candidate = error as { code?: unknown };

  return (
    typeof candidate.code === "string" &&
    candidate.code.startsWith("auth/")
  );
}

/** Extrae el código auth/… desde un FirebaseError o desde el texto del mensaje */
export function extractFirebaseAuthCode(error: unknown): string | null {
  if (isFirebaseAuthError(error)) {
    return error.code;
  }

  if (error instanceof Error) {
    const fromMessage = error.message.match(/auth\/[a-z0-9-]+/i);
    if (fromMessage) {
      return fromMessage[0];
    }
  }

  return null;
}

export function getFirebaseAuthErrorMessage(
  error: unknown,
  context: AuthErrorContext
): string {
  const fallback = CONTEXT_FALLBACKS[context];
  const code = extractFirebaseAuthCode(error);

  if (code && FIREBASE_AUTH_ERROR_MESSAGES[code]) {
    return FIREBASE_AUTH_ERROR_MESSAGES[code];
  }

  return fallback;
}

/**
 * Resuelve el mensaje para mostrar al usuario:
 * 1. Errores de Firebase Auth (traducidos)
 * 2. Errores del backend (ApiError)
 * 3. Fallback según contexto (login / registro / Google)
 */
export function resolveAuthErrorMessage(
  error: unknown,
  context: AuthErrorContext
): string {
  // Si se lanzó un Error con un mensaje legible (y no contiene un código auth/...),
  // usamos ese mensaje directamente para poder mostrar avisos personalizados.
  if (
    error instanceof Error &&
    typeof error.message === "string" &&
    !error.message.match(/auth\/[a-z0-9-]+/i)
  ) {
    return error.message;
  }
  if (isFirebaseAuthError(error) || extractFirebaseAuthCode(error)) {
    return getFirebaseAuthErrorMessage(error, context);
  }

  if (error instanceof ApiError) {
    return getApiErrorMessage(
      error,
      CONTEXT_FALLBACKS[context]
    );
  }

  return getFirebaseAuthErrorMessage(error, context);
}

/** @deprecated Usar resolveAuthErrorMessage(error, 'google') */
export function getGoogleAuthErrorMessage(err: unknown): string {
  return resolveAuthErrorMessage(err, "google");
}

/** @deprecated Usar resolveAuthErrorMessage(error, 'login-email') */
export function getEmailLoginErrorMessage(err: unknown): string {
  return resolveAuthErrorMessage(err, "login-email");
}

/** @deprecated Usar resolveAuthErrorMessage(error, 'register-email') */
export function getEmailRegisterErrorMessage(err: unknown): string {
  return resolveAuthErrorMessage(err, "register-email");
}
