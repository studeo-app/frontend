import RouteBasePage from '@/shared/components/RouteBasePage'
import useDocumentTitle from '@/shared/hooks/useDocumentTitle'
import { useParams } from 'react-router'

export default function RoomPage() {
  const { id } = useParams()

  useDocumentTitle('Room')

  return (
    <RouteBasePage
      title="Sala"
      description="Detalle de sala con boton para regresar al dashboard."
      routeLabel={id ? `/room/${id}` : '/room/:id'}
    />
  )
}
