import ThemeToggle from "./ThemeToggle";

type PageThemeToggleProps = {
  className?: string;
  /** Usa tokens auth (login, register, completar perfil) */
  variant?: "default" | "auth";
};

export default function PageThemeToggle({
  className = "",
  variant = "default",
}: PageThemeToggleProps) {
  const isAuth = variant === "auth";

  return (
    <div
      className={`fixed right-4 top-4 z-50 sm:right-6 sm:top-6 ${className}`}
    >
      <ThemeToggle
        className={
          isAuth
            ? "border-auth-input-border bg-auth-surface text-auth-title hover:bg-auth-input-bg hover:text-auth-title"
            : undefined
        }
      />
    </div>
  );
}
