import RouteBasePage from '@/shared/components/RouteBasePage'
import useDocumentTitle from '@/shared/hooks/useDocumentTitle'

export default function LandingPage() {
  useDocumentTitle('Landing')

  return (
    <RouteBasePage
      title="Landing"
      description="Vista base para la ruta publica principal."
      routeLabel="/"
    />
  )
}
