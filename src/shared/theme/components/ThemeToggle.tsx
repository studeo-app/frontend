import { Moon, Sun } from 'lucide-react'
import { useThemeStore } from '../stores/theme.store'
import { useThemeTransition } from '../hooks/useThemeTransition'
import '../styles/theme.animations.css'

export default function ThemeToggle() {
  const theme = useThemeStore((state) => state.theme)
  
  const toggleTheme = useThemeStore(
    (state) => state.toggleTheme,
  )
  
  const { startTransition } = useThemeTransition()

  const handleToggle = (
    e: React.MouseEvent<HTMLButtonElement>,
  ) => {
    startTransition(
      () => {
        toggleTheme()
      },
      e.clientX,
      e.clientY,
    )
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label="Toggle theme"
      className="
        relative
        inline-flex
        h-10
        w-10
        items-center
        justify-center
        overflow-hidden
        rounded-xl
        border
        border-border
        bg-card
        text-foreground
        transition-all
        duration-300

        hover:bg-accent
        hover:text-accent-foreground

        active:scale-95

        focus-visible:outline-none
        focus-visible:ring-2
        focus-visible:ring-ring
      "
    >
      {/* Sun */}
      <Sun className={`
        absolute
        h-5
        w-5
        transition-all
        duration-500

        ${
          theme === 'light'
            ? 'rotate-90 scale-0 opacity-0'
            : 'rotate-0 scale-100 opacity-100'
        }
      `} />

      {/* Moon */}
      <Moon className={`
        absolute
        h-5
        w-5
        transition-all
        duration-500

        ${
          theme === 'light'
            ? 'rotate-0 scale-100 opacity-100'
            : '-rotate-90 scale-0 opacity-0'
        }
      `} /> 
    </button>
  )
}
