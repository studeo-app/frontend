import RouteBasePage from '@/shared/components/RouteBasePage'
import useDocumentTitle from '@/shared/hooks/useDocumentTitle'

export default function CompleteProfilePage() {
  useDocumentTitle('Complete Profile')

  return (
    <RouteBasePage
      title="Completar perfil"
      description="Pantalla de datos adicionales para terminar el registro."
      routeLabel="/complete-profile"
    />
  )
}
