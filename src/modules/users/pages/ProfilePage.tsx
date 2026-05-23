import RouteBasePage from '@/shared/components/RouteBasePage'
import useDocumentTitle from '@/shared/hooks/useDocumentTitle'

export default function ProfilePage() {
  useDocumentTitle('Profile')

  return (
    <RouteBasePage
      title="Perfil"
      description="Vista del perfil del usuario dentro del estilo del dashboard."
      routeLabel="/dashboard/profile"
    />
  )
}
