import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'

export type ScrollRevealVariant = 'up' | 'left' | 'right' | 'scale'

interface ScrollRevealProps {
  children: ReactNode
  className?: string
  variant?: ScrollRevealVariant
  /** Retraso en ms antes de iniciar la animación */
  delay?: number
  /** Porcentaje visible para disparar (0–1) */
  threshold?: number
}

const variantClass: Record<ScrollRevealVariant, string> = {
  up: 'landing-reveal-up',
  left: 'landing-reveal-left',
  right: 'landing-reveal-right',
  scale: 'landing-reveal-scale',
}

export default function ScrollReveal({
  children,
  className = '',
  variant = 'up',
  delay = 0,
  threshold = 0.12,
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVisible(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      {
        threshold,
        rootMargin: '0px 0px -5% 0px',
      },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold])

  const style = {
    '--reveal-delay': `${delay}ms`,
  } as CSSProperties

  return (
    <div
      ref={ref}
      className={`landing-reveal ${variantClass[variant]} ${
        visible ? 'landing-reveal-visible' : ''
      } ${className}`}
      style={style}
    >
      {children}
    </div>
  )
}
