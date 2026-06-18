import { useState, useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { RoomParticipant } from '../types/roomSession'
import { VideoTile } from './VideoTile'

interface VideoGridProps {
  participants: RoomParticipant[]
  mirrorLocalVideo?: boolean
  outputVolume?: number
  isOwner?: boolean
  onMuteParticipant?: (uid: string) => void
  onKickParticipant?: (uid: string) => void
}

function getGridItemStyle(M: number, isMobile: boolean) {
  let cols = 1
  let rows = 1

  if (isMobile) {
    if (M === 1) { cols = 1; rows = 1 }
    else if (M === 2) { cols = 1; rows = 2 }
    else if (M === 3) { cols = 1; rows = 3 }
    else if (M === 4) { cols = 2; rows = 2 }
    else if (M <= 6) { cols = 2; rows = 3 }
    else if (M <= 8) { cols = 2; rows = 4 }
    else if (M === 9) { cols = 3; rows = 3 }
    else { cols = 3; rows = 4 }
  } else {
    // Desktop
    if (M === 1) { cols = 1; rows = 1 }
    else if (M === 2) { cols = 2; rows = 1 }
    else if (M === 3) { cols = 3; rows = 1 }
    else if (M === 4) { cols = 2; rows = 2 }
    else if (M <= 6) { cols = 3; rows = 2 }
    else if (M <= 8) { cols = 4; rows = 2 }
    else if (M === 9) { cols = 3; rows = 3 }
    else { cols = 4; rows = 3 }
  }

  return {
    aspectRatio: '16 / 9',
    width: `min(calc(100cqw / ${cols} - 16px), calc((100cqh / ${rows} - 16px) * 16 / 9))`
  }
}

export function VideoGrid({
  participants,
  mirrorLocalVideo = true,
  outputVolume = 80,
  isOwner = false,
  onMuteParticipant,
  onKickParticipant,
}: VideoGridProps) {
  // 1. Detección de dispositivo móvil (ancho < 640px) para el layout responsivo
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640)
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // 2. Ordenar participantes: El usuario local siempre va primero (arriba a la izquierda)
  const sortedParticipants = [...participants].sort((a, b) => {
    if (a.isLocal) return -1
    if (b.isLocal) return 1
    return 0
  })

  // 3. Construir lista de mosaicos (cámara y compartir pantalla por separado)
  const allTiles: { id: string; type: 'camera' | 'screen'; participant: RoomParticipant }[] = []
  sortedParticipants.forEach((p) => {
    // Tile de cámara
    allTiles.push({
      id: `${p.socketId}-camera`,
      type: 'camera',
      participant: p,
    })
    // Tile de pantalla compartida (si está activa y tiene stream)
    if (p.isScreenSharing && p.videoStream) {
      allTiles.push({
        id: `${p.socketId}-screen`,
        type: 'screen',
        participant: p,
      })
    }
  })

  const hasScreenShares = allTiles.some((t) => t.type === 'screen')

  // 4. Estados de fijado (Pin) de mosaico
  const [pinnedTileId, setPinnedTileId] = useState<string | null>(null)

  // Auto-fijar pantallas compartidas cuando aparezcan
  const prevScreenShareIdsRef = useRef<string[]>([])
  useEffect(() => {
    const currentScreenShareIds = allTiles.filter((t) => t.type === 'screen').map((t) => t.id)
    const newlyAdded = currentScreenShareIds.find((id) => !prevScreenShareIdsRef.current.includes(id))

    if (newlyAdded) {
      setPinnedTileId(newlyAdded)
    } else if (pinnedTileId && pinnedTileId.endsWith('-screen') && !currentScreenShareIds.includes(pinnedTileId)) {
      // Si el screen share fijado se detuvo, fijamos otro si queda, o limpiamos
      if (currentScreenShareIds.length > 0) {
        setPinnedTileId(currentScreenShareIds[0])
      } else {
        setPinnedTileId(null)
      }
    }
    prevScreenShareIdsRef.current = currentScreenShareIds
  }, [allTiles, pinnedTileId])

  // Verificar si el tile fijado sigue existiendo en la sala
  const pinnedTile = allTiles.find((t) => t.id === pinnedTileId)
  const isPinnedMode = Boolean(pinnedTile)

  // 5. Estados de paginación
  const [gridPage, setGridPage] = useState(1)
  const [sidebarPage, setSidebarPage] = useState(1)

  // Reiniciar páginas al cambiar la cantidad de tiles
  const allTilesCount = allTiles.length
  useEffect(() => {
    setGridPage(1)
  }, [allTilesCount])

  const otherTiles = allTiles.filter((t) => t.id !== pinnedTileId)
  const otherTilesCount = otherTiles.length
  useEffect(() => {
    setSidebarPage(1)
  }, [otherTilesCount, pinnedTileId])

  // --- MODO 1: CON PINNED TILE ---
  if (isPinnedMode && pinnedTile) {
    const maxSidebarItems = isMobile ? 3 : 4
    const totalSidebarPages = Math.ceil(otherTiles.length / maxSidebarItems)
    const sidebarStartIndex = (sidebarPage - 1) * maxSidebarItems
    const slicedOtherTiles = otherTiles.slice(sidebarStartIndex, sidebarStartIndex + maxSidebarItems)

    return (
      <div
        className="w-full h-full flex flex-col sm:flex-row gap-2.5 sm:gap-3 p-2 sm:p-4 overflow-hidden"
        role="list"
        aria-label="Participantes en la sala con orador fijado"
      >
        {/* Orador/Pantalla Fijada (Área Principal) */}
        <div className="flex-1 min-w-0 min-h-0 relative @container flex items-center justify-center" style={{ containerType: 'size' }}>
          <div style={{ aspectRatio: '16 / 9', width: 'min(100cqw, calc(100cqh * 16 / 9))' }} className="flex items-center justify-center">
            <VideoTile
              participant={pinnedTile.participant}
              mirrorLocalVideo={pinnedTile.type === 'camera' ? mirrorLocalVideo : false}
              outputVolume={outputVolume}
              mode={pinnedTile.type}
              isPinned={true}
              onTogglePin={() => setPinnedTileId(null)}
              isOwner={isOwner}
              onMute={() => onMuteParticipant?.(pinnedTile.participant.id)}
              onKick={() => onKickParticipant?.(pinnedTile.participant.id)}
              fullSize={true}
            />
          </div>
        </div>

        {/* Mosaicos Secundarios (Barra lateral o inferior) */}
        {otherTiles.length > 0 && (
          isMobile ? (
            // Layout móvil: tira horizontal inferior
            <div className="h-[105px] w-full flex items-center justify-between gap-1.5 bg-auth-input-bg/10 p-1 rounded-xl border border-auth-input-border/20 shrink-0 select-none min-w-0">
              {totalSidebarPages > 1 && (
                <button
                  type="button"
                  disabled={sidebarPage === 1}
                  onClick={() => setSidebarPage((p) => Math.max(1, p - 1))}
                  className="p-1 rounded bg-auth-bg/75 border border-auth-input-border/30 text-auth-label hover:text-auth-title disabled:opacity-35 cursor-pointer shrink-0"
                  aria-label="Página anterior del carrusel"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
              )}

              <div className="flex-1 h-full flex items-center justify-center gap-1.5 min-w-0">
                {slicedOtherTiles.map((tile) => (
                  <div key={tile.id} className="h-full shrink-0 aspect-video">
                    <VideoTile
                      participant={tile.participant}
                      mirrorLocalVideo={tile.type === 'camera' ? mirrorLocalVideo : false}
                      outputVolume={outputVolume}
                      mode={tile.type}
                      isPinned={false}
                      onTogglePin={() => setPinnedTileId(tile.id)}
                      suppressScreenShareVideo={hasScreenShares && tile.type === 'camera'}
                      isOwner={isOwner}
                      onMute={() => onMuteParticipant?.(tile.participant.id)}
                      onKick={() => onKickParticipant?.(tile.participant.id)}
                      fullSize={true}
                    />
                  </div>
                ))}
              </div>

              {totalSidebarPages > 1 && (
                <button
                  type="button"
                  disabled={sidebarPage === totalSidebarPages}
                  onClick={() => setSidebarPage((p) => Math.min(totalSidebarPages, p + 1))}
                  className="p-1 rounded bg-auth-bg/75 border border-auth-input-border/30 text-auth-label hover:text-auth-title disabled:opacity-35 cursor-pointer shrink-0"
                  aria-label="Siguiente página del carrusel"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              )}
            </div>
          ) : (
            // Layout desktop: barra lateral vertical derecha
            <div className="w-[220px] h-full flex flex-col justify-between items-center gap-2 bg-auth-input-bg/15 p-2 rounded-2xl border border-auth-input-border/25 shrink-0 select-none">
              {totalSidebarPages > 1 && (
                <div className="flex items-center justify-between w-full px-2 py-1 bg-auth-bg/60 rounded-lg border border-auth-input-border/20 text-[10px]">
                  <button
                    type="button"
                    disabled={sidebarPage === 1}
                    onClick={() => setSidebarPage((p) => Math.max(1, p - 1))}
                    className="p-0.5 rounded hover:bg-auth-input-bg disabled:opacity-35 cursor-pointer"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <span className="text-auth-label font-medium">
                    {sidebarPage} / {totalSidebarPages}
                  </span>
                  <button
                    type="button"
                    disabled={sidebarPage === totalSidebarPages}
                    onClick={() => setSidebarPage((p) => Math.min(totalSidebarPages, p + 1))}
                    className="p-0.5 rounded hover:bg-auth-input-bg disabled:opacity-35 cursor-pointer"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              <div className="flex-1 w-full flex flex-col gap-2 min-h-0 justify-start items-center overflow-y-auto">
                {slicedOtherTiles.map((tile) => (
                  <div key={tile.id} className="w-full shrink-0 aspect-video">
                    <VideoTile
                      participant={tile.participant}
                      mirrorLocalVideo={tile.type === 'camera' ? mirrorLocalVideo : false}
                      outputVolume={outputVolume}
                      mode={tile.type}
                      isPinned={false}
                      onTogglePin={() => setPinnedTileId(tile.id)}
                      suppressScreenShareVideo={hasScreenShares && tile.type === 'camera'}
                      isOwner={isOwner}
                      onMute={() => onMuteParticipant?.(tile.participant.id)}
                      onKick={() => onKickParticipant?.(tile.participant.id)}
                      fullSize={true}
                    />
                  </div>
                ))}
              </div>
            </div>
          )
        )}
      </div>
    )
  }

  // --- MODO 2: SIN PINNED TILE (GRID ESTÁNDAR DE MÁXIMO 12) ---
  const N = allTiles.length
  let itemsToRender: { key: string; type: 'tile' | 'prev' | 'next'; tile?: typeof allTiles[0] }[] = []

  if (N <= 12) {
    itemsToRender = allTiles.map((tile) => ({
      key: tile.id,
      type: 'tile' as const,
      tile,
    }))
  } else {
    // Lógica de partición para N > 12
    if (gridPage === 1) {
      itemsToRender = allTiles.slice(0, 11).map((tile) => ({
        key: tile.id,
        type: 'tile' as const,
        tile,
      }))
      itemsToRender.push({ key: 'next-btn', type: 'next' })
    } else {
      const startIndex = 11 + (gridPage - 2) * 10
      const remaining = N - startIndex
      itemsToRender.push({ key: 'prev-btn', type: 'prev' })

      if (remaining <= 11) {
        itemsToRender.push(
          ...allTiles.slice(startIndex, N).map((tile) => ({
            key: tile.id,
            type: 'tile' as const,
            tile,
          }))
        )
      } else {
        itemsToRender.push(
          ...allTiles.slice(startIndex, startIndex + 10).map((tile) => ({
            key: tile.id,
            type: 'tile' as const,
            tile,
          }))
        )
        itemsToRender.push({ key: 'next-btn', type: 'next' })
      }
    }
  }

  const M = itemsToRender.length
  const itemStyle = getGridItemStyle(M, isMobile)

  return (
    <div
      className="w-full h-full p-2 sm:p-4 overflow-hidden flex flex-col"
      role="list"
      aria-label="Participantes en la sala"
    >
      <div
        className="@container w-full h-full flex flex-wrap items-center justify-center content-center gap-2 sm:gap-3 overflow-hidden"
        style={{ containerType: 'size' }}
      >
        {itemsToRender.map((slot) => {
          if (slot.type === 'tile' && slot.tile) {
            return (
              <div key={slot.key} role="listitem" style={itemStyle} className="flex items-center justify-center min-h-0 min-w-0 transition-all duration-300">
                <VideoTile
                  participant={slot.tile.participant}
                  mirrorLocalVideo={slot.tile.type === 'camera' ? mirrorLocalVideo : false}
                  outputVolume={outputVolume}
                  mode={slot.tile.type}
                  isPinned={false}
                  onTogglePin={() => setPinnedTileId(slot.tile!.id)}
                  suppressScreenShareVideo={hasScreenShares && slot.tile.type === 'camera'}
                  isOwner={isOwner}
                  onMute={() => onMuteParticipant?.(slot.tile!.participant.id)}
                  onKick={() => onKickParticipant?.(slot.tile!.participant.id)}
                  fullSize={true}
                />
              </div>
            )
          }

          if (slot.type === 'next') {
            return (
              <div key={slot.key} role="listitem" style={itemStyle} className="flex items-center justify-center min-h-0 min-w-0 transition-all duration-300">
                <button
                  type="button"
                  onClick={() => setGridPage((p) => p + 1)}
                  className="flex max-w-full max-h-full w-full h-full flex-col items-center justify-center gap-2 rounded-xl border border-auth-input-border bg-auth-input-bg/40 text-auth-label hover:border-auth-btn/40 hover:text-auth-title transition cursor-pointer select-none"
                  aria-label="Siguiente página de participantes"
                >
                  <ChevronRight className="h-8 w-8 text-auth-btn animate-pulse" />
                  <span className="text-[11px] font-semibold">Siguiente Página</span>
                </button>
              </div>
            )
          }

          if (slot.type === 'prev') {
            return (
              <div key={slot.key} role="listitem" style={itemStyle} className="flex items-center justify-center min-h-0 min-w-0 transition-all duration-300">
                <button
                  type="button"
                  onClick={() => setGridPage((p) => p - 1)}
                  className="flex max-w-full max-h-full w-full h-full flex-col items-center justify-center gap-2 rounded-xl border border-auth-input-border bg-auth-input-bg/40 text-auth-label hover:border-auth-btn/40 hover:text-auth-title transition cursor-pointer select-none"
                  aria-label="Página anterior de participantes"
                >
                  <ChevronLeft className="h-8 w-8 text-auth-btn animate-pulse" />
                  <span className="text-[11px] font-semibold">Página Anterior</span>
                </button>
              </div>
            )
          }

          return null
        })}
      </div>
    </div>
  )
}