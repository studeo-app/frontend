import { useCallback, useState } from "react";
import {
  CloudinaryUploadError,
  uploadImageToCloudinary,
} from "@/modules/media/cloudinary";

interface UseCloudinaryAvatarUploadOptions {
  folder?: string;
  userId?: string;
}

export function useCloudinaryAvatarUpload(
  options: UseCloudinaryAvatarUploadOptions = {}
) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const uploadAvatar = useCallback(
    async (file: File) => {
      setIsUploading(true);
      setUploadError(null);

      try {
        const result = await uploadImageToCloudinary(file, {
          folder: options.folder ?? "studeo/avatars",
          tags: options.userId ? [`uid_${options.userId}`] : undefined,
        });

        return result;
      } catch (err) {
        const message =
          err instanceof CloudinaryUploadError
            ? err.message
            : "No se pudo subir la imagen.";

        setUploadError(message);
        throw err;
      } finally {
        setIsUploading(false);
      }
    },
    [options.folder, options.userId]
  );

  const clearUploadError = useCallback(() => {
    setUploadError(null);
  }, []);

  return {
    isUploading,
    uploadError,
    uploadAvatar,
    clearUploadError,
  };
}
