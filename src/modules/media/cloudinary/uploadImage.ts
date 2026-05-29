import {
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_UPLOAD_PRESET,
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
 * Sube una imagen a Cloudinary mediante unsigned upload (upload preset).
 * Devuelve la URL segura para guardar en Firestore.
 */
export async function uploadImageToCloudinary(
  file: File,
  options: CloudinaryUploadOptions = {}
): Promise<CloudinaryUploadResult> {
  if (!isCloudinaryConfigured()) {
    throw new CloudinaryUploadError(
      "Cloudinary no está configurado. Revisa las variables de entorno."
    );
  }

  validateImageFile(file);

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

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
