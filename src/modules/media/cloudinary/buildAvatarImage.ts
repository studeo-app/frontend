import { fill } from "@cloudinary/url-gen/actions/resize";
import type { CloudinaryImage } from "@cloudinary/url-gen";
import {
  extractCloudinaryPublicId,
  getCloudinaryClient,
  isCloudinaryAssetUrl,
} from "@/config/cloudinary.config";

const AVATAR_SIZE = 200;

/**
 * Transformación optimizada para avatares cuadrados en Cloudinary.
 * Siempre usa public_id (nunca la secure_url completa).
 */
export function buildAvatarCloudinaryImage(
  source: string,
  publicId?: string
): CloudinaryImage | null {
  const resolvedPublicId =
    publicId?.trim() ||
    (isCloudinaryAssetUrl(source) ? extractCloudinaryPublicId(source) : null);

  if (!resolvedPublicId) {
    return null;
  }

  const cld = getCloudinaryClient();

  return cld
    .image(resolvedPublicId)
    .format("auto")
    .quality("auto")
    .resize(fill().width(AVATAR_SIZE).height(AVATAR_SIZE));
}
