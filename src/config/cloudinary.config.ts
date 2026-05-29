import { Cloudinary } from "@cloudinary/url-gen";

const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string | undefined;
const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as
  | string
  | undefined;

export const CLOUDINARY_CLOUD_NAME = cloudName ?? "dnrpqenrg";
export const CLOUDINARY_UPLOAD_PRESET = uploadPreset ?? "studeo_avatars";

export function getCloudinaryClient(): Cloudinary {
  return new Cloudinary({
    cloud: { cloudName: CLOUDINARY_CLOUD_NAME },
  });
}

export function isCloudinaryConfigured(): boolean {
  return Boolean(CLOUDINARY_CLOUD_NAME && CLOUDINARY_UPLOAD_PRESET);
}

export function isCloudinaryAssetUrl(url: string): boolean {
  return /res\.cloudinary\.com/i.test(url);
}

/**
 * Obtiene el public_id desde una secure_url de Cloudinary.
 * Evita pasar la URL completa al SDK (provoca URLs anidadas duplicadas).
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
