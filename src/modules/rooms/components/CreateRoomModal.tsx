import React, { useState, useRef } from "react";
import { BaseModal } from "@/shared/components/ui/BaseModal";
import { ErrorModal } from "@/shared/components/ui/ErrorModal";
import { SuccessModal } from "@/shared/components/ui/SuccessModal";
import { DEFAULT_ROOM_COVERS } from "../constants/defaultRoomCovers";
import { useCreateRoom } from "../hooks/useCreateRoom";
import { Upload, X, Check } from "lucide-react";

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (roomId: string) => void;
}

interface CustomUploadItem {
  id: string;
  file: File;
  previewUrl: string;
}

export const CreateRoomModal: React.FC<CreateRoomModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [name, setName] = useState("");
  const [customUploads, setCustomUploads] = useState<CustomUploadItem[]>([]);
  const [selectedCoverId, setSelectedCoverId] = useState<string>("cover-1");
  const uploadIndexRef = useRef(1);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { startCreateRoom, isCreating, errorMsg, setErrorMsg, successRoomId, setSuccessRoomId } = useCreateRoom();

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
  };

  const getCleanedName = (rawName: string) => {
    return rawName.trim().replace(/\s+/g, " ");
  };

  const cleanedName = getCleanedName(name);
  const isNameValid = cleanedName.length >= 3 && cleanedName.length <= 50;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const previewUrl = URL.createObjectURL(file);
      const newId = `custom-${uploadIndexRef.current}`;
      uploadIndexRef.current += 1;

      const newItem: CustomUploadItem = {
        id: newId,
        file,
        previewUrl,
      };

      setCustomUploads((prev) => [...prev, newItem]);
      setSelectedCoverId(newId);
      
      // Reset input value to allow uploading the same file again
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveCustomUpload = (e: React.MouseEvent, itemId: string) => {
    e.stopPropagation();
    
    // Revoke URL to release memory
    const target = customUploads.find((item) => item.id === itemId);
    if (target) {
      URL.revokeObjectURL(target.previewUrl);
    }

    setCustomUploads((prev) => prev.filter((item) => item.id !== itemId));

    // If deleted item was the selected one, select the first preset
    if (selectedCoverId === itemId) {
      setSelectedCoverId("cover-1");
    }
  };

  const handleClose = () => {
    // Revoke object URLs to avoid memory leaks
    customUploads.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    setCustomUploads([]);
    setName("");
    setSelectedCoverId("cover-1");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onClose();
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isNameValid || isCreating) return;

    let imageFile: File | null = null;
    let presetUrl: string | null = null;

    if (selectedCoverId.startsWith("custom-")) {
      const match = customUploads.find((item) => item.id === selectedCoverId);
      if (match) {
        imageFile = match.file;
      }
    } else {
      const match = DEFAULT_ROOM_COVERS.find((c) => c.id === selectedCoverId);
      if (match) {
        presetUrl = match.src;
      }
    }

    try {
      await startCreateRoom({
        name: cleanedName,
        imageFile,
        presetUrl,
      });
    } catch {
      // Handled inside the hook
    }
  };

  const handleSuccessClose = () => {
    if (successRoomId) {
      const id = successRoomId;
      customUploads.forEach((item) => URL.revokeObjectURL(item.previewUrl));
      setCustomUploads([]);
      setName("");
      setSelectedCoverId("cover-1");
      setSuccessRoomId(null);
      onSuccess(id);
    }
  };

  return (
    <>
      <BaseModal isOpen={isOpen} onClose={handleClose}>
        <div className="flex flex-col text-left">
          <h2 className="text-2xl font-bold tracking-tight text-center text-auth-title">
            Crear Nueva Sala
          </h2>
          <p className="mt-1.5 text-xs text-center text-auth-label">
            Define el nombre y la identidad visual de tu espacio de estudio.
          </p>

          <form onSubmit={handleCreate} className="mt-6 space-y-6">
            {/* Room Name */}
            <div className="space-y-2">
              <label htmlFor="room-name" className="text-[11px] font-semibold uppercase tracking-wider text-auth-label block">
                Nombre de la sala
              </label>
              <input
                id="room-name"
                type="text"
                placeholder="Ej: Laboratorio de Inteligencia Artificial"
                value={name}
                onChange={handleNameChange}
                disabled={isCreating}
                maxLength={60}
                className="w-full h-11 px-4 text-sm rounded-xl border border-auth-input-border bg-auth-input-bg text-auth-title focus:outline-none focus:ring-2 focus:ring-auth-btn focus:border-transparent transition"
              />
              <div className="flex justify-between items-center px-1">
                <span className="text-[10px] text-auth-label">
                  {name.length > 0 && !isNameValid && (
                    <span className="text-auth-error">El nombre debe tener entre 3 y 50 caracteres</span>
                  )}
                </span>
                <span className="text-[10px] text-auth-label">
                  {cleanedName.length}/50
                </span>
              </div>
            </div>

            {/* Cover Image */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-auth-label">
                  Imagen de portada
                </span>
                <span className="text-[10px] text-auth-label font-normal lowercase">
                  Selecciona una imagen o sube la tuya
                </span>
              </div>

              {/* Grid Options */}
              <div className="grid grid-cols-3 gap-2 max-h-[220px] overflow-y-auto pr-1">
                {/* Upload own button card */}
                <button
                  type="button"
                  onClick={() => !isCreating && fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center aspect-video rounded-lg border-2 border-dashed border-auth-input-border bg-auth-input-bg/20 hover:bg-auth-input-bg/40 text-auth-label hover:text-auth-title cursor-pointer transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-auth-btn"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                    disabled={isCreating}
                  />
                  <Upload className="h-5 w-5 mb-1" />
                  <span className="text-[10px] font-medium text-center">Subir propia</span>
                </button>

                {/* Preset covers */}
                {DEFAULT_ROOM_COVERS.map((cover) => {
                  const isSelected = selectedCoverId === cover.id;
                  return (
                    <button
                      key={cover.id}
                      type="button"
                      onClick={() => !isCreating && setSelectedCoverId(cover.id)}
                      className={`
                        relative aspect-video rounded-lg overflow-hidden cursor-pointer border-2 transition text-left p-0
                        hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-auth-btn
                        ${isSelected ? "border-auth-btn shadow-md" : "border-transparent opacity-80 hover:opacity-100"}
                      `}
                    >
                      <img
                        src={cover.src}
                        alt={cover.name}
                        className="w-full h-full object-cover"
                      />
                      {isSelected && (
                        <div className="absolute inset-0 bg-auth-btn/20 flex items-center justify-center">
                          <div className="h-5 w-5 bg-auth-btn text-auth-btn-text rounded-full flex items-center justify-center shadow-md">
                            <Check className="h-3.5 w-3.5" />
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })}

                {/* Custom uploaded covers */}
                {customUploads.map((item) => {
                  const isSelected = selectedCoverId === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => !isCreating && setSelectedCoverId(item.id)}
                      className={`
                        relative aspect-video rounded-lg overflow-hidden cursor-pointer border-2 transition group text-left p-0
                        hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-auth-btn
                        ${isSelected ? "border-auth-btn shadow-md" : "border-transparent opacity-85 hover:opacity-100"}
                      `}
                    >
                      <img
                        src={item.previewUrl}
                        alt="Uploaded preview"
                        className="w-full h-full object-cover"
                      />
                      
                      {/* X Button to remove upload */}
                      <button
                        type="button"
                        onClick={(e) => handleRemoveCustomUpload(e, item.id)}
                        aria-label="Remove uploaded image"
                        className="absolute top-1 right-1 h-5 w-5 bg-black/60 text-white rounded-full flex items-center justify-center hover:bg-auth-error transition opacity-0 group-hover:opacity-100 z-20"
                      >
                        <X className="h-3 w-3" />
                      </button>

                      {isSelected && (
                        <div className="absolute inset-0 bg-auth-btn/20 flex items-center justify-center">
                          <div className="h-5 w-5 bg-auth-btn text-auth-btn-text rounded-full flex items-center justify-center shadow-md">
                            <Check className="h-3.5 w-3.5" />
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={!isNameValid || isCreating}
                className="flex-1 h-11 bg-auth-btn text-auth-btn-text font-semibold rounded-xl text-sm transition hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
              >
                {isCreating ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-current" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.37 0 0 5.37 0 12h4z" />
                    </svg>
                    <span>Creando...</span>
                  </>
                ) : (
                  <span>Crear Sala</span>
                )}
              </button>

              <button
                type="button"
                onClick={handleClose}
                disabled={isCreating}
                className="px-5 h-11 border border-auth-input-border text-auth-title font-medium rounded-xl text-sm transition hover:bg-auth-input-bg active:scale-[0.98] disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </BaseModal>

      {/* Success Modal */}
      <SuccessModal
        isOpen={!!successRoomId}
        onClose={handleSuccessClose}
        title="¡Sala creada con éxito!"
        message="Tu espacio de estudio está listo. Te estamos redirigiendo al salón en unos instantes..."
      />

      {/* Error Modal */}
      <ErrorModal
        isOpen={!!errorMsg}
        onClose={() => setErrorMsg(null)}
        title="Error al crear sala"
        message={errorMsg || ""}
      />
    </>
  );
};
