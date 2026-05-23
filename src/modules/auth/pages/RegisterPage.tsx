import RouteBasePage from '@/shared/components/RouteBasePage'
import useDocumentTitle from '@/shared/hooks/useDocumentTitle'

export default function RegisterPage() {
  useDocumentTitle('Register')

  return (
    <RouteBasePage
      title="Registro"
      description="Pantalla de creacion de cuenta con la base visual del dashboard."
      routeLabel="/register"
    />
  )
}
