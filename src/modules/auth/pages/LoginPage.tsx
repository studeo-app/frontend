// pages/LoginPage.tsx
import React from "react";
import { Card, CardContent } from "@/shared/components/ui/Card";
import { LoginForm } from "../components/LoginForm";

const LoginPage: React.FC = () => {
  const handleLogin = async (data: {
    email: string;
    password: string;
  }) => {
    console.log("Login:", data);

    await new Promise((resolve) => setTimeout(resolve, 1200));

    // window.location.href = "/dashboard";
  };

  const handleGoogleLogin = async () => {
    console.log("Google login");

    await new Promise((resolve) => setTimeout(resolve, 1200));
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-8">
      {/* Background Effects */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        {/* Glow */}
        <div className="absolute left-[-10%] top-[-10%] h-105 w-105 rounded-full bg-primary/10 blur-3xl" />

        <div className="absolute bottom-[-15%] right-[-10%] h-105 w-105 rounded-full bg-secondary/10 blur-3xl" />

        {/* Grid */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              "radial-gradient(hsl(var(--foreground)) 0.6px, transparent 0.6px)",
            backgroundSize: "24px 24px",
          }}
        />
      </div>

      {/* Auth Card */}
      <Card
        className="
          w-full
          max-w-md
          border-border/60
          bg-card/80
          shadow-2xl
          backdrop-blur-xl
        "
      >
        <CardContent className="p-8 md:p-10">
          {/* Logo */}
          <div className="mb-10 text-center">
            <span className="bg-linear-to-r from-primary to-primary/70 bg-clip-text text-3xl font-semibold tracking-tight text-transparent">
              Studeo
            </span>
          </div>

          {/* Header */}
          <div className="mb-8 space-y-3 text-center">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              Continúa en Studeo
            </h1>

            <p className="mx-auto max-w-sm text-sm leading-relaxed text-muted-foreground">
              Accede a tus salas de estudio, sesiones colaborativas y recursos
              compartidos.
            </p>
          </div>

          {/* Form */}
          <LoginForm
            onSubmit={handleLogin}
            onGoogleLogin={handleGoogleLogin}
          />

          {/* Footer */}
          <p className="mt-8 text-center text-xs leading-relaxed text-muted-foreground">
            Al continuar, aceptas nuestros{" "}
            <a
              href="/terms"
              className="text-foreground transition-colors hover:text-primary"
            >
              Términos
            </a>{" "}
            y{" "}
            <a
              href="/policy"
              className="text-foreground transition-colors hover:text-primary"
            >
              Política de privacidad
            </a>
            .
          </p>
        </CardContent>
      </Card>
    </main>
  );
};

export default LoginPage;
