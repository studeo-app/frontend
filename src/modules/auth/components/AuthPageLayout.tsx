import React from "react";
import { authClasses } from "../theme/authTheme";

interface AuthPageLayoutProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Contenedor base para /login y /register.
 * Aplica tipografía JetBrains Mono y fondo del tema auth.
 */
export const AuthPageLayout: React.FC<AuthPageLayoutProps> = ({
  children,
  className = "",
}) => {
  return (
    <div
      className={`${authClasses.page} relative flex h-full items-center justify-center overflow-hidden px-4 sm:px-6 ${className}`}
    >
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-[-10%] top-[-10%] h-105 w-105 rounded-full bg-auth-btn/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] h-105 w-105 rounded-full bg-auth-link/10 blur-[120px]" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "radial-gradient(var(--auth-label) 0.5px, transparent 0.5px)",
            backgroundSize: "24px 24px",
          }}
        />
      </div>

      {children}
    </div>
  );
};
