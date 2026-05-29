/**
 * Traduce mensajes conocidos del backend (class-validator, Nest) al español.
 * No parte por comas el texto en inglés (p. ej. "letters, numbers, and underscores").
 */

const RULES: { test: RegExp; message: string }[] = [
  {
    test: /username must be 3-20 characters[\s\S]*?underscores/i,
    message:
      "El nombre de usuario debe tener entre 3 y 20 caracteres y solo puede incluir letras minúsculas, números y guiones bajos (_).",
  },
  {
    test: /shorter than or equal to 20 characters/i,
    message: "El nombre de usuario no puede superar los 20 caracteres.",
  },
  {
    test: /username is already taken/i,
    message: "Este nombre de usuario ya está en uso. Elige otro.",
  },
  {
    test: /avatar url is required/i,
    message: "Debes elegir o subir una foto de perfil.",
  },
  {
    test: /profile is already complete/i,
    message: "Tu perfil ya está completo.",
  },
];

/** Traduce un mensaje del backend (uno o varios errores de validación). */
export function translateBackendMessage(message: string): string {
  const normalized = message.trim().replace(/\s+/g, " ");
  if (!normalized) return normalized;

  const translated: string[] = [];
  let remaining = normalized;

  for (const { test, message: es } of RULES) {
    if (test.test(remaining)) {
      translated.push(es);
      remaining = remaining.replace(test, " ");
    }
  }

  remaining = remaining
    .replace(/,\s*,/g, ",")
    .replace(/^[,\s]+|[,\s]+$/g, "")
    .trim();

  if (translated.length > 0) {
    return [...new Set(translated)].join(" ");
  }

  return normalized;
}
