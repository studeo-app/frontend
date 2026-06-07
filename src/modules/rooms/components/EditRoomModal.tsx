import { useEffect, useState } from 'react'
import { BaseModal } from '@/shared/components/ui/BaseModal'
import { ErrorModal } from '@/shared/components/ui/ErrorModal'
import { SuccessModal } from '@/shared/components/ui/SuccessModal'
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
      setErrorMsg(null)
      setUpdatedRoom(null)
    }
  }, [isOpen, room.name, setErrorMsg, setUpdatedRoom])

  const cleanedName = getCleanedName(name)
  const isNameValid = cleanedName.length >= 3 && cleanedName.length <= 50
  const hasChanges = cleanedName !== room.name

  const handleClose = () => {
    if (isUpdating) return
    setName(room.name)
    setErrorMsg(null)
    setUpdatedRoom(null)
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isNameValid || !hasChanges || isUpdating) return

    try {
      await startUpdateRoom(room.id, cleanedName)
    } catch {
      /* handled in hook */
    }
  }

  const handleSuccessClose = () => {
    if (updatedRoom) {
      const updated = updatedRoom
      setUpdatedRoom(null)
      onSuccess(updated)
      onClose()
    }
  }

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
            className="text-2xl font-bold tracking-tight text-center text-auth-title"
          >
            Editar sala
          </h2>
          <p
            id="edit-room-modal-desc"
            className="mt-1.5 text-xs text-center text-auth-label"
          >
            Modifica el nombre de tu espacio de estudio.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-6">
            <div className="space-y-2">
              <label
                htmlFor="edit-room-name"
                className="text-[11px] font-semibold uppercase tracking-wider text-auth-label block"
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
                className="w-full h-11 px-4 text-sm rounded-xl border border-auth-input-border bg-auth-input-bg text-auth-title focus:outline-none focus:ring-2 focus:ring-auth-btn focus:border-transparent transition"
              />
              <div className="flex justify-between items-center px-1">
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

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={!isNameValid || !hasChanges || isUpdating}
                className="flex-1 h-11 bg-auth-btn text-auth-btn-text font-semibold rounded-xl text-sm transition hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer focus-visible:ring-2 focus-visible:ring-auth-btn focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                {isUpdating ? 'Guardando...' : 'Guardar cambios'}
              </button>
              <button
                type="button"
                onClick={handleClose}
                disabled={isUpdating}
                className="px-5 h-11 border border-auth-input-border text-auth-title font-medium rounded-xl text-sm transition hover:bg-auth-input-bg active:scale-[0.98] disabled:opacity-50 cursor-pointer focus-visible:ring-2 focus-visible:ring-auth-btn focus-visible:ring-offset-2 focus-visible:outline-none"
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
