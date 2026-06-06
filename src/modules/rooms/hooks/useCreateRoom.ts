import { useState } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import { getApiErrorMessage } from "@/shared/api/apiError";
import {
  CloudinaryUploadError,
  uploadImageToCloudinary,
} from "@/modules/media/cloudinary/uploadImage";
import { checkBackendHealth, createRoom } from "../api/roomsApi";

function resolveCreateRoomError(error: unknown): string {
  if (error instanceof CloudinaryUploadError) {
    return error.message;
  }

  return getApiErrorMessage(
    error,
    "No pudimos crear la sala. Inténtalo de nuevo."
  );
}

interface CreateRoomParams {
  name: string;
  imageFile: File | null;
  presetUrl: string | null;
}

export function useCreateRoom() {
  const [isCreating, setIsCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successRoomId, setSuccessRoomId] = useState<string | null>(null);
  const getIdToken = useAuthStore((state) => state.getIdToken);

  const startCreateRoom = async ({ name, imageFile, presetUrl }: CreateRoomParams) => {
    setIsCreating(true);
    setErrorMsg(null);
    setSuccessRoomId(null);

    try {
      // Paso 1: Health check del backend
      try {
        await checkBackendHealth();
      } catch {
        throw new Error(
          "El servidor de la aplicación no está disponible. Por favor, inténtalo más tarde."
        );
      }

      // Paso 2: Subir imagen si es personalizada, o usar presetUrl, o vacía
      let finalImageUrl = presetUrl || "";

      if (imageFile) {
        try {
          const uploadRes = await uploadImageToCloudinary(imageFile, "ROOMS");
          finalImageUrl = uploadRes.secureUrl;
        } catch (uploadErr: unknown) {
          throw uploadErr instanceof CloudinaryUploadError
            ? uploadErr
            : new Error(
                `No se pudo subir la imagen de portada: ${getApiErrorMessage(uploadErr, "Error de red")}`
              );
        }
      }

      // Paso 3 & 4: Crear la sala en backend
      let token: string;
      try {
        token = await getIdToken();
      } catch {
        throw new Error(
          "Tu sesión ha expirado. Vuelve a iniciar sesión e inténtalo de nuevo."
        );
      }
      const payload = {
        name,
        ...(finalImageUrl ? { imageUrl: finalImageUrl } : {}),
      };

      const room = await createRoom(token, payload);
      
      // Paso 5: Guardar el ID de la sala creada para gatillar éxito y redirección
      setSuccessRoomId(room.id);
      return room;
    } catch (err: unknown) {
      const message = resolveCreateRoomError(err);
      setErrorMsg(message);
      throw err;
    } finally {
      setIsCreating(false);
    }
  };

  return {
    startCreateRoom,
    isCreating,
    errorMsg,
    setErrorMsg,
    successRoomId,
    setSuccessRoomId,
  };
}
