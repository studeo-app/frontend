import React from "react";
import { Card, CardContent } from "@/shared/components/ui/Card";
import { RegisterForm } from "../components/RegisterForm";

const RegisterPage: React.FC = () => {
  const handleRegister = async (data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  }) => {
    console.log("Register:", data);

    await new Promise((resolve) => setTimeout(resolve, 1200));
  };

  const handleGoogleRegister = async () => {
    console.log("Google register");

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

      {/* Register Card */}
      <Card
        className="
          w-full
          max-w-lg
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
              Crea tu cuenta
            </h1>

            <p className="mx-auto max-w-md text-sm leading-relaxed text-muted-foreground">
              Únete a tus salas de estudio, organiza sesiones colaborativas y
              aprende con tu comunidad.
            </p>
          </div>

          {/* Form */}
          <RegisterForm
            onSubmit={handleRegister}
            onGoogleRegister={handleGoogleRegister}
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

export default RegisterPage;
