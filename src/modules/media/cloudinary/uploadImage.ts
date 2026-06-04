import {
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_PRESETS,
  isCloudinaryConfigured,
} from "@/config/cloudinary.config";
import type {
  CloudinaryUploadOptions,
  CloudinaryUploadResult,
} from "./types";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

interface CloudinaryApiResponse {
  secure_url: string;
  public_id: string;
  width: number;
  height: number;
  error?: { message: string };
}

export class CloudinaryUploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CloudinaryUploadError";
  }
}

function validateImageFile(file: File): void {
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new CloudinaryUploadError(
      "Formato no válido. Usa JPG, PNG, WebP o GIF."
    );
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new CloudinaryUploadError(
      "La imagen es demasiado grande. El máximo es 5 MB."
    );
  }
}

/**
 * Sube una imagen a Cloudinary mediante unsigned upload usando presets específicos.
 * @param file - El archivo a subir.
 * @param presetType - 'AVATARS' o 'ROOMS' (basado en tus CLOUDINARY_PRESETS).
 * @param options - Carpeta o tags adicionales.
 */
export async function uploadImageToCloudinary(
  file: File,
  presetType: keyof typeof CLOUDINARY_PRESETS = "AVATARS",
  options: CloudinaryUploadOptions = {}
): Promise<CloudinaryUploadResult> {

  if (!isCloudinaryConfigured()) {
    throw new CloudinaryUploadError(
      "Cloudinary no está configurado. Revisa las variables de entorno VITE_."
    );
  }

  validateImageFile(file);

  const formData = new FormData();
  formData.append("file", file);

  // Usamos el preset seleccionado dinámicamente
  const uploadPreset = CLOUDINARY_PRESETS[presetType];
  formData.append("upload_preset", uploadPreset);

  // Si pasas una carpeta por opciones, Cloudinary la usará como subcarpeta
  if (options.folder) {
    formData.append("folder", options.folder);
  }

  if (options.tags?.length) {
    formData.append("tags", options.tags.join(","));
  }

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    {
      method: "POST",
      body: formData,
    }
  );

  const data = (await response.json()) as CloudinaryApiResponse;

  if (!response.ok || data.error) {
    throw new CloudinaryUploadError(
      data.error?.message ?? "No se pudo subir la imagen. Inténtalo de nuevo."
    );
  }

  return {
    secureUrl: data.secure_url,
    publicId: data.public_id,
    width: data.width,
    height: data.height,
  };
}