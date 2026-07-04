import ScrollReveal from '../components/ScrollReveal'
import { authClasses } from '@/modules/auth/theme/authTheme'
import useDocumentTitle from '@/shared/hooks/useDocumentTitle'
import {
  ArrowRight,
  BookOpen,
  MessageCircle,
  Mic,
  Sparkles,
  Video,
  Zap,
} from 'lucide-react'
import { useCallback, useRef, useState } from 'react'
import { Link } from 'react-router'
import '../styles/landing.css'

const features = [
  {
    icon: Video,
    title: 'Salas en vivo',
    description:
      'Reúne a tu equipo en espacios colaborativos con video y pantalla compartida.',
    reveal: 'left' as const,
  },
  {
    icon: MessageCircle,
    title: 'Chat en tiempo real',
    description:
      'Conversa, comparte archivos y mantén el contexto sin salir de la sesión.',
    reveal: 'right' as const,
  },
  {
    icon: Mic,
    title: 'Voz cristalina',
    description:
      'Canales de voz estables para estudiar, practicar o resolver dudas al instante.',
    reveal: 'left' as const,
  },
  {
    icon: BookOpen,
    title: 'Recursos compartidos',
    description:
      'Apuntes, código y material de clase accesible para todo el grupo.',
    reveal: 'right' as const,
  },
] as const

const highlights = [
  { value: '24/7', label: 'Disponible', color: 'text-auth-btn' },
  { value: '∞', label: 'Salas', color: 'text-auth-link' },
  { value: '100%', label: 'Estudiantes', color: 'text-auth-title' },
] as const

export default function LandingPage() {
  useDocumentTitle('Inicio')
  const heroRef = useRef<HTMLDivElement>(null)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })

  const handleHeroMove = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const rect = heroRef.current?.getBoundingClientRect()
      if (!rect) return

      const x = (event.clientX - rect.left) / rect.width - 0.5
      const y = (event.clientY - rect.top) / rect.height - 0.5
      setTilt({ x: x * 8, y: y * -8 })
    },
    [],
  )

  const handleHeroLeave = useCallback(() => {
    setTilt({ x: 0, y: 0 })
  }, [])

  return (
    <div className="relative overflow-visible">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-12 -z-10 overflow-visible"
      >
        <div className="landing-glow absolute -left-24 top-0 h-80 w-80 rounded-full bg-auth-btn/15 blur-3xl" />
        <div className="landing-glow absolute right-0 bottom-10 h-80 w-80 rounded-full bg-auth-link/12 blur-3xl [animation-delay:1.2s]" />
        <div className="absolute inset-x-0 top-1/3 h-px bg-gradient-to-r from-transparent via-auth-btn/40 to-transparent" />
      </div>

      <section
        ref={heroRef}
        onMouseMove={handleHeroMove}
        onMouseLeave={handleHeroLeave}
        className="relative grid items-center gap-10 overflow-visible lg:grid-cols-2 lg:gap-14"
      >
        <div className="space-y-6">
          <div className="landing-animate-in landing-delay-1 inline-flex items-center gap-2 rounded-full border border-auth-input-border bg-auth-input-bg/80 px-4 py-1.5 text-sm font-medium text-auth-label">
            <Sparkles className="h-4 w-4 text-auth-btn" aria-hidden="true" />
            <span>Colabora sin límites</span>
          </div>

          <h1
            className={`landing-animate-in landing-delay-2 text-4xl font-bold leading-[1.1] tracking-tight text-auth-title sm:text-5xl lg:text-[3.25rem] ${authClasses.title}`}
          >
            Tu espacio de estudio{' '}
            <span className="landing-shimmer-text">en órbita</span>
          </h1>

          <p
            className={`landing-animate-in landing-delay-3 max-w-lg text-base leading-relaxed sm:text-lg ${authClasses.subtitle}`}
          >
            Studeo conecta a tu equipo en salas virtuales con chat, voz y
            recursos compartidos. Estudia, crea y avanza juntos desde cualquier
            lugar.
          </p>

          <div className="landing-animate-in landing-delay-4 flex flex-wrap gap-3">
            <Link
              to="/login"
              className={`${authClasses.btnPrimary} group inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-auth-btn`}
            >
              Iniciar sesión
              <ArrowRight
                className="h-4 w-4 transition group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </Link>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 rounded-xl border border-auth-input-border bg-auth-surface px-6 py-3 text-sm font-semibold text-auth-link transition hover:border-auth-btn/50 hover:bg-auth-input-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-auth-btn"
            >
              Crear cuenta
            </Link>
          </div>

          <ScrollReveal variant="up" delay={100} className="pt-2">
            <ul className="flex flex-wrap gap-4">
              {highlights.map((item, index) => (
                <li
                  key={item.label}
                  className="rounded-xl border border-auth-input-border bg-auth-surface px-4 py-3 shadow-sm"
                  style={{ transitionDelay: `${index * 60}ms` }}
                >
                  <p className={`text-2xl font-bold ${item.color}`}>
                    {item.value}
                  </p>
                  <p className="text-xs font-medium uppercase tracking-wider text-auth-label">
                    {item.label}
                  </p>
                </li>
              ))}
            </ul>
          </ScrollReveal>
        </div>

        <ScrollReveal
          variant="right"
          delay={150}
          className="landing-hero-stage relative mx-auto min-w-0 w-full max-w-xl lg:max-w-none"
        >
          <div aria-hidden="true" className="landing-hero-glows">
            <div className="landing-orbit-ring absolute inset-2 rounded-3xl border-2 border-dashed border-auth-input-border/60" />
            <div className="landing-glow absolute inset-0 rounded-[2rem] bg-auth-btn/20 blur-2xl" />
            <div className="landing-glow absolute inset-1 rounded-3xl bg-auth-link/10 blur-xl [animation-delay:1s]" />
          </div>

          <div className="landing-hero-float relative">
            <div
              className="relative transition-transform duration-150 ease-out"
              style={{
                transform: `perspective(1000px) rotateX(${tilt.y}deg) rotateY(${tilt.x}deg)`,
              }}
            >
              <figure className="relative overflow-hidden rounded-2xl border border-auth-input-border bg-auth-surface shadow-2xl shadow-auth-btn/15 ring-1 ring-auth-btn/20">
                <img
                  src="/landing.jpg"
                  alt="Estudiantes colaborando en un espacio futurista con interfaces holográficas"
                  className="aspect-[4/3] w-full object-cover"
                  loading="eager"
                  fetchPriority="high"
                />
              </figure>
            </div>
          </div>
        </ScrollReveal>
      </section>

      <section
        aria-labelledby="features-heading"
        className="mt-20 space-y-10 sm:mt-28"
      >
        <ScrollReveal variant="up">
          <div className="text-center sm:text-left">
            <p className="auth-label mb-2">Funcionalidades</p>
            <h2
              id="features-heading"
              className={`text-2xl font-bold tracking-tight sm:text-3xl ${authClasses.title}`}
            >
              Todo lo que necesitas para{' '}
              <span className="text-auth-btn">estudiar en equipo</span>
            </h2>
            <p className={`mt-2 max-w-2xl ${authClasses.subtitle}`}>
              Herramientas pensadas para la vida universitaria: rápidas,
              accesibles y alineadas con tu flujo de trabajo.
            </p>
          </div>
        </ScrollReveal>

        <ul className="grid gap-5 sm:grid-cols-2 sm:gap-6">
          {features.map(({ icon: Icon, title, description, reveal }, index) => (
            <li key={title}>
              <ScrollReveal
                variant={reveal}
                delay={index * 100}
                className="h-full"
              >
                <article className="landing-card-hover group h-full rounded-2xl border border-auth-input-border bg-auth-surface p-5 shadow-sm">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-auth-btn text-auth-btn-text shadow-md transition group-hover:scale-105">
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <h3 className="font-semibold text-auth-title">{title}</h3>
                  <p className={`mt-2 text-sm leading-relaxed ${authClasses.subtitle}`}>
                    {description}
                  </p>
                </article>
              </ScrollReveal>
            </li>
          ))}
        </ul>
      </section>

      <ScrollReveal variant="scale" className="mt-20 sm:mt-28">
        <section
          aria-labelledby="cta-heading"
          className="relative overflow-hidden rounded-2xl border border-auth-input-border bg-auth-btn bg-gradient-to-r from-auth-btn/95 to-auth-btn p-8 text-auth-btn-text shadow-lg shadow-auth-btn/20 sm:p-10"
        >
          <div className="relative z-10 flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2 opacity-90">
                <Zap className="h-5 w-5" aria-hidden="true" />
                <span className="text-sm font-medium uppercase tracking-wider">
                  Empieza hoy
                </span>
              </div>
              <h2
                id="cta-heading"
                className="text-2xl font-bold tracking-tight sm:text-3xl"
              >
                ¿Listo para despegar?
              </h2>
              <p className="max-w-md text-sm opacity-90">
                Crea tu cuenta gratis y accede a salas, chat y voz en un solo
                lugar. Si ya tienes cuenta, inicia sesión.
              </p>
            </div>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <Link
                to="/register"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-auth-google-bg px-6 py-3 text-sm font-semibold text-auth-google-text shadow-sm transition hover:brightness-95 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-auth-btn-text"
              >
                Registrarse gratis
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center justify-center rounded-xl border border-auth-btn-text/40 bg-auth-btn-text/10 px-6 py-3 text-sm font-semibold backdrop-blur-sm transition hover:bg-auth-btn-text/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-auth-btn-text"
              >
                Ya tengo cuenta
              </Link>
            </div>
          </div>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-auth-link/15 blur-3xl"
          />
        </section>
      </ScrollReveal>
    </div>
  )
}
