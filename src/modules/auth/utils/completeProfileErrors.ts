import { ApiError, getApiErrorMessage } from "@/shared/api/apiError";
import { translateBackendMessage } from "@/shared/utils/translateBackendMessage";

const USERNAME_TAKEN_PATTERNS = [
  "username is already taken",
  "ya está en uso",
  "already taken",
];

const NETWORK_PATTERNS = [
  "failed to fetch",
  "network",
  "fetch",
  "conexión",
  "conectar",
];

function matchesAny(text: string, patterns: string[]): boolean {
  const lower = text.toLowerCase();
  return patterns.some((p) => lower.includes(p));
}

export function resolveCompleteProfileErrorMessage(
  error: unknown
): string {
  if (error instanceof TypeError) {
    return "No pudimos conectar con el servidor. Revisa tu internet e inténtalo de nuevo.";
  }

  const rawMessage =
    error instanceof ApiError
      ? getApiErrorMessage(
          error,
          "No pudimos completar tu perfil. Inténtalo de nuevo."
        )
      : error instanceof Error
        ? error.message
        : "No pudimos completar tu perfil. Inténtalo de nuevo.";

  const message = translateBackendMessage(rawMessage);

  if (matchesAny(message, USERNAME_TAKEN_PATTERNS)) {
    return "Este nombre de usuario ya está en uso. Elige otro.";
  }

  if (matchesAny(rawMessage, USERNAME_TAKEN_PATTERNS)) {
    return "Este nombre de usuario ya está en uso. Elige otro.";
  }

  if (matchesAny(message, NETWORK_PATTERNS) || matchesAny(rawMessage, NETWORK_PATTERNS)) {
    return "No pudimos conectar con el servidor. Revisa tu internet e inténtalo de nuevo.";
  }

  if (
    rawMessage.includes("Avatar URL is required") ||
    message.includes("foto de perfil")
  ) {
    return "Debes elegir o subir una foto de perfil.";
  }

  if (rawMessage.includes("Profile is already complete")) {
    return "Tu perfil ya está completo. Serás redirigido al inicio.";
  }

  if (
    rawMessage.toLowerCase().includes("username must") ||
    rawMessage.toLowerCase().includes("shorter than or equal to 20")
  ) {
    return message;
  }

  return message;
}

export function getCompleteProfileErrorTitle(error: unknown): string {
  const raw =
    error instanceof ApiError
      ? getApiErrorMessage(error, "")
      : error instanceof Error
        ? error.message
        : "";

  const message = resolveCompleteProfileErrorMessage(error);

  if (
    matchesAny(message, USERNAME_TAKEN_PATTERNS) ||
    matchesAny(raw, USERNAME_TAKEN_PATTERNS)
  ) {
    return "Nombre de usuario no disponible";
  }

  if (
    error instanceof TypeError ||
    matchesAny(message, NETWORK_PATTERNS) ||
    matchesAny(raw, NETWORK_PATTERNS)
  ) {
    return "Problema de conexión";
  }

  if (
    raw.toLowerCase().includes("username must") ||
    raw.toLowerCase().includes("shorter than or equal to 20")
  ) {
    return "Nombre de usuario no válido";
  }

  return "No pudimos completar tu perfil";
}
