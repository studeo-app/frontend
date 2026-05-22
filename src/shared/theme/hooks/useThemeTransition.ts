
export function useThemeTransition() {
  const startTransition = (
    callback: () => void,
    x?: number,
    y?: number,
  ) => {
    if (x !== undefined && y !== undefined) {
      document.documentElement.style.setProperty(
        '--x',
        `${x}px`,
      )

      document.documentElement.style.setProperty(
        '--y',
        `${y}px`,
      )
    }

    if (!document.startViewTransition) {
      callback()
      return
    }

    document.startViewTransition(() => {
      callback()
    })
  }

  return { startTransition }
}