import { useState } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import { uploadImageToCloudinary } from "@/modules/media/cloudinary/uploadImage";
import { checkBackendHealth, createRoom } from "../api/roomsApi";

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
        } catch (uploadErr: any) {
          throw new Error(
            `No se pudo subir la imagen de portada: ${uploadErr?.message ?? "Error de red"}`
          );
        }
      }

      // Paso 3 & 4: Crear la sala en backend
      const token = await getIdToken();
      const payload = {
        name,
        ...(finalImageUrl ? { imageUrl: finalImageUrl } : {}),
      };

      const room = await createRoom(token, payload);
      
      // Paso 5: Guardar el ID de la sala creada para gatillar éxito y redirección
      setSuccessRoomId(room.id);
      return room;
    } catch (err: any) {
      setErrorMsg(err?.message ?? "Error inesperado al crear la sala");
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
