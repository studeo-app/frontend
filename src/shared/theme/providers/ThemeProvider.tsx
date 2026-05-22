import { useThemeStore } from "../stores/theme.store";
import { useEffect } from "react";

interface Props {
  children: React.ReactNode
}

export default function ThemeProvider({ children }: Props) {
  const theme = useThemeStore((state) => state.theme)

  useEffect(() => {
    const root = document.documentElement;

    root.classList.remove('light', 'dark');
    root.classList.add(theme);
  }, [theme]);

  return children
}
