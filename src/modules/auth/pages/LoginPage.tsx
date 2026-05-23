import RouteBasePage from '@/shared/components/RouteBasePage'
import useDocumentTitle from '@/shared/hooks/useDocumentTitle'

export default function LoginPage() {
  useDocumentTitle('Login')

  return (
    <RouteBasePage
      title="Login"
      description="Pantalla de inicio de sesion con estilo del dashboard."
      routeLabel="/login"
    />
  )
}
