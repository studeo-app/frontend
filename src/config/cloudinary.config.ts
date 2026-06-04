import { Cloudinary } from "@cloudinary/url-gen";

const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string | undefined;

// 1. Capturamos ambos presets desde el .env
const presetAvatars = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET_AVATARS as string | undefined;
const presetRooms = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET_ROOMS as string | undefined;

export const CLOUDINARY_CLOUD_NAME = cloudName ?? "dnrpqenrg";

// 2. Agrupamos los presets en un objeto exportable
export const CLOUDINARY_PRESETS = {
  AVATARS: presetAvatars ?? "studeo_avatars",
  ROOMS: presetRooms ?? "studeo_rooms", // Fallback para fotos de salas
};

export function getCloudinaryClient(): Cloudinary {
  return new Cloudinary({
    cloud: { cloudName: CLOUDINARY_CLOUD_NAME },
  });
}

// 3. Actualizamos la validación para asegurar que al menos el de avatars esté listo
export function isCloudinaryConfigured(): boolean {
  return Boolean(CLOUDINARY_CLOUD_NAME && CLOUDINARY_PRESETS.AVATARS);
}

export function isCloudinaryAssetUrl(url: string): boolean {
  return /res\.cloudinary\.com/i.test(url);
}

/**
 * Obtiene el public_id desde una secure_url de Cloudinary.
 */
export function extractCloudinaryPublicId(url: string): string | null {
  const trimmed = url.trim();
  if (!isCloudinaryAssetUrl(trimmed)) return null;

  const cloudinaryUrls = trimmed.match(
    /https?:\/\/res\.cloudinary\.com\/[a-z0-9-]+\/image\/upload\/[^"'\s)]+/gi
  );
  const target = cloudinaryUrls?.length
    ? cloudinaryUrls[cloudinaryUrls.length - 1]
    : trimmed;

  const withoutQuery = target.split("?")[0];
  const versionMatch = withoutQuery.match(/\/v\d+\/(.+)$/i);

  if (!versionMatch?.[1]) return null;

  return versionMatch[1].replace(/\.[a-z0-9]+$/i, "");
}