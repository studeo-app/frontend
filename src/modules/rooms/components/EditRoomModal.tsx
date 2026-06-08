import { useEffect, useRef, useState } from 'react'
import { Check, ImagePlus } from 'lucide-react'
import { BaseModal } from '@/shared/components/ui/BaseModal'
import { ErrorModal } from '@/shared/components/ui/ErrorModal'
import { SuccessModal } from '@/shared/components/ui/SuccessModal'
import { DEFAULT_ROOM_COVERS } from '../constants/defaultRoomCovers'
import { useUpdateRoom } from '../hooks/useUpdateRoom'
import type { Room } from '@/types/room'

interface EditRoomModalProps {
  isOpen: boolean
  room: Room
  onClose: () => void
  onSuccess: (room: Room) => void
}

function getCleanedName(rawName: string) {
  return rawName.trim().replace(/\s+/g, ' ')
}

export function EditRoomModal({
  isOpen,
  room,
  onClose,
  onSuccess,
}: EditRoomModalProps) {
  const [name, setName] = useState(room.name)
  const [selectedImageUrl, setSelectedImageUrl] = useState(room.imageUrl ?? '')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const {
    startUpdateRoom,
    isUpdating,
    errorMsg,
    setErrorMsg,
    updatedRoom,
    setUpdatedRoom,
  } = useUpdateRoom()

  useEffect(() => {
    if (isOpen) {
      setName(room.name)
      setSelectedImageUrl(room.imageUrl ?? '')
      setImageFile(null)
      setPreviewUrl(null)
      setErrorMsg(null)
      setUpdatedRoom(null)
    }
  }, [isOpen, room.name, room.imageUrl, setErrorMsg, setUpdatedRoom])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const cleanedName = getCleanedName(name)
  const isNameValid = cleanedName.length >= 3 && cleanedName.length <= 50
  const currentImageUrl = room.imageUrl ?? ''
  const hasChanges =
    cleanedName !== room.name || selectedImageUrl !== currentImageUrl || !!imageFile

  const resetLocalImage = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setImageFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleClose = () => {
    if (isUpdating) return
    resetLocalImage()
    setName(room.name)
    setSelectedImageUrl(room.imageUrl ?? '')
    setErrorMsg(null)
    setUpdatedRoom(null)
    onClose()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    resetLocalImage()
    const nextPreviewUrl = URL.createObjectURL(file)
    setImageFile(file)
    setPreviewUrl(nextPreviewUrl)
    setSelectedImageUrl(nextPreviewUrl)
  }

  const handleSelectImageUrl = (url: string) => {
    if (isUpdating) return
    resetLocalImage()
    setSelectedImageUrl(url)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isNameValid || !hasChanges || isUpdating) return

    try {
      await startUpdateRoom(room.id, {
        name: cleanedName,
        imageFile,
        imageUrl: imageFile ? undefined : selectedImageUrl,
      })
    } catch {
      /* handled in hook */
    }
  }

  const handleSuccessClose = () => {
    if (updatedRoom) {
      const updated = updatedRoom
      resetLocalImage()
      setUpdatedRoom(null)
      onSuccess(updated)
      onClose()
    }
  }

  const imageOptions = [
    ...(currentImageUrl
      ? [{ id: 'current', name: 'Actual', src: currentImageUrl }]
      : []),
    ...DEFAULT_ROOM_COVERS,
  ].filter(
    (cover, index, covers) =>
      covers.findIndex((candidate) => candidate.src === cover.src) === index,
  )
  const visiblePreview = previewUrl ?? selectedImageUrl

  return (
    <>
      <BaseModal
        isOpen={isOpen}
        onClose={handleClose}
        labelledBy="edit-room-modal-title"
        describedBy="edit-room-modal-desc"
      >
        <div className="flex flex-col text-left">
          <h2
            id="edit-room-modal-title"
            className="text-center text-2xl font-bold tracking-tight text-auth-title"
          >
            Editar sala
          </h2>
          <p
            id="edit-room-modal-desc"
            className="mt-1.5 text-center text-xs text-auth-label"
          >
            Modifica el nombre y la portada de tu espacio.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-6">
            <div className="space-y-2">
              <label
                htmlFor="edit-room-name"
                className="block text-[11px] font-semibold uppercase tracking-wider text-auth-label"
              >
                Nombre de la sala
              </label>
              <input
                id="edit-room-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isUpdating}
                maxLength={60}
                aria-invalid={name.length > 0 && !isNameValid ? 'true' : 'false'}
                className="h-11 w-full rounded-xl border border-auth-input-border bg-auth-input-bg px-4 text-sm text-auth-title transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-auth-btn"
              />
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] text-auth-label">
                  {name.length > 0 && !isNameValid && (
                    <span className="text-auth-error">
                      El nombre debe tener entre 3 y 50 caracteres
                    </span>
                  )}
                </span>
                <span className="text-[10px] text-auth-label">
                  {cleanedName.length}/50
                </span>
              </div>
            </div>

            <fieldset className="m-0 space-y-3 border-0 p-0">
              <legend className="text-[11px] font-semibold uppercase tracking-wider text-auth-label">
                Imagen de portada
              </legend>

              <div className="overflow-hidden rounded-xl border border-auth-input-border bg-auth-input-bg">
                {visiblePreview ? (
                  <img
                    src={visiblePreview}
                    alt="Vista previa de portada"
                    className="aspect-video w-full object-cover"
                  />
                ) : (
                  <div className="flex aspect-video items-center justify-center text-auth-label">
                    <ImagePlus className="h-8 w-8" aria-hidden="true" />
                  </div>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={handleFileChange}
                disabled={isUpdating}
                aria-label="Subir nueva portada"
              />

              <div className="grid max-h-[180px] grid-cols-3 gap-2 overflow-y-auto pr-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUpdating}
                  className="flex aspect-video cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-auth-input-border bg-auth-input-bg/20 text-auth-label transition hover:bg-auth-input-bg/40 hover:text-auth-title disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-auth-btn"
                >
                  <ImagePlus className="mb-1 h-5 w-5" aria-hidden="true" />
                  <span className="text-center text-[10px] font-medium">Subir</span>
                </button>

                {previewUrl && (
                  <button
                    type="button"
                    onClick={() => setSelectedImageUrl(previewUrl)}
                    disabled={isUpdating}
                    aria-label="Seleccionar imagen subida"
                    className="relative aspect-video cursor-pointer overflow-hidden rounded-lg border-2 border-auth-btn p-0 text-left shadow-md transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-auth-btn"
                  >
                    <img
                      src={previewUrl}
                      alt=""
                      className="h-full w-full object-cover"
                      aria-hidden="true"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-auth-btn/20">
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-auth-btn text-auth-btn-text shadow-md">
                        <Check className="h-3.5 w-3.5" aria-hidden="true" />
                      </div>
                    </div>
                  </button>
                )}

                {imageOptions.map((cover) => {
                  const isSelected = !imageFile && selectedImageUrl === cover.src
                  return (
                    <button
                      key={`${cover.id}-${cover.src}`}
                      type="button"
                      onClick={() => handleSelectImageUrl(cover.src)}
                      disabled={isUpdating}
                      aria-label={`Seleccionar portada ${cover.name}`}
                      className={`relative aspect-video cursor-pointer overflow-hidden rounded-lg border-2 p-0 text-left transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-auth-btn ${
                        isSelected ? 'border-auth-btn shadow-md' : 'border-transparent opacity-80 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={cover.src}
                        alt=""
                        className="h-full w-full object-cover"
                        aria-hidden="true"
                      />
                      {isSelected && (
                        <div className="absolute inset-0 flex items-center justify-center bg-auth-btn/20">
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-auth-btn text-auth-btn-text shadow-md">
                            <Check className="h-3.5 w-3.5" aria-hidden="true" />
                          </div>
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </fieldset>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={!isNameValid || !hasChanges || isUpdating}
                className="h-11 flex-1 cursor-pointer rounded-xl bg-auth-btn text-sm font-semibold text-auth-btn-text transition hover:brightness-110 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-auth-btn focus-visible:ring-offset-2"
              >
                {isUpdating ? 'Guardando...' : 'Guardar cambios'}
              </button>
              <button
                type="button"
                onClick={handleClose}
                disabled={isUpdating}
                className="h-11 cursor-pointer rounded-xl border border-auth-input-border px-5 text-sm font-medium text-auth-title transition hover:bg-auth-input-bg active:scale-[0.98] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-auth-btn focus-visible:ring-offset-2"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </BaseModal>

      <SuccessModal
        isOpen={!!updatedRoom}
        onClose={handleSuccessClose}
        title="¡Sala actualizada!"
        message="Los cambios se han guardado correctamente."
      />

      <ErrorModal
        isOpen={!!errorMsg}
        onClose={() => setErrorMsg(null)}
        title="Error al editar sala"
        message={errorMsg ?? ''}
      />
    </>
  )
}
