// pages/RegisterPage.tsx
import React from "react";

import { RegisterForm } from "../components/RegisterForm";

const RegisterPage: React.FC = () => {
  const handleRegister = async (data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  }) => {
    console.log("Register:", data);

    await new Promise((resolve) =>
      setTimeout(resolve, 1000)
    );
  };

  const handleGoogleRegister = async () => {
    console.log("Google register");

    await new Promise((resolve) =>
      setTimeout(resolve, 1000)
    );
  };

  return (
    <div
      className="
        relative
        flex
        min-h-screen
        items-center
        justify-center
        overflow-hidden
        bg-background
        px-6
        py-12
      "
    >
      {/* Background */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div
          className="
            absolute
            right-[-10%]
            top-[-10%]
            h-[400px]
            w-[400px]
            rounded-full
            bg-primary/10
            blur-[120px]
          "
        />

        <div
          className="
            absolute
            bottom-[-10%]
            left-[-10%]
            h-[400px]
            w-[400px]
            rounded-full
            bg-secondary/10
            blur-[120px]
          "
        />

        <div
          className="
            absolute
            inset-0
            opacity-[0.03]
          "
          style={{
            backgroundImage:
              "radial-gradient(hsl(var(--foreground)) 0.5px, transparent 0.5px)",
            backgroundSize: "24px 24px",
          }}
        />
      </div>

      {/* Content */}
      <div className="w-full max-w-[420px]">
        {/* Logo */}
        <div className="mb-4">
          <span
            className="
              bg-gradient-to-r
              from-primary
              to-secondary
              bg-clip-text
              text-3xl
              font-bold
              tracking-tight
              text-transparent
            "
          >
            Studeo
          </span>
        </div>

        {/* Heading */}
        <div className="mb-4">
          <h1
            className="
              text-4xl
              font-bold
              tracking-tight
              text-foreground
            "
          >
            Crea tu cuenta
          </h1>

          <p
            className="
              mt-3
              text-base
              text-muted-foreground
            "
          >
            Únete a tu comunidad de estudio
          </p>
        </div>

        {/* Form */}
        <RegisterForm
          onSubmit={handleRegister}
          onGoogleRegister={handleGoogleRegister}
        />

        {/* Footer */}
        <p
          className="
            mt-10
            text-center
            text-xs
            text-muted-foreground
          "
        >
          Al continuar, aceptas nuestros{" "}
          <a
            href="#"
            className="
              text-primary
              transition-colors
              hover:text-primary/80
            "
          >
            Términos
          </a>{" "}
          y{" "}
          <a
            href="#"
            className="
              text-primary
              transition-colors
              hover:text-primary/80
            "
          >
            Política de privacidad
          </a>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;