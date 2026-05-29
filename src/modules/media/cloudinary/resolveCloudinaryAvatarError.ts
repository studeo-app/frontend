import { CloudinaryUploadError } from "./uploadImage";

/**
 * Mensaje detallado para el cuerpo del modal de error al subir avatar.
 */
export function resolveCloudinaryAvatarErrorMessage(error: unknown): string {
  if (error instanceof CloudinaryUploadError) {
    return error.message;
  }

  if (error instanceof TypeError) {
    return "No pudimos conectar. Revisa tu internet e inténtalo de nuevo.";
  }

  if (error instanceof Error && error.message.trim()) {
    const msg = error.message.toLowerCase();

    if (
      msg.includes("file size") ||
      msg.includes("too large") ||
      msg.includes("demasiado grande")
    ) {
      return "La imagen es demasiado grande. El máximo es 5 MB.";
    }

    if (
      msg.includes("format") ||
      msg.includes("invalid image") ||
      msg.includes("no válido")
    ) {
      return "Formato no válido. Usa JPG, PNG, WebP o GIF.";
    }

    if (msg.includes("network") || msg.includes("fetch")) {
      return "No pudimos conectar. Revisa tu internet e inténtalo de nuevo.";
    }

    return error.message;
  }

  return "Inténtalo de nuevo en unos segundos.";
}
