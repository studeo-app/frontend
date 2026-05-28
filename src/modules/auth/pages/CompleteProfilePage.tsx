import React from "react";

import { Card, CardContent } from "@/shared/components/ui/Card";

import { CompleteProfileForm } from "../components/CompleteProfileForm";

const CompleteProfilePage: React.FC = () => {
  const handleCompleteProfile = async (data: {
    username: string;
  }) => {
    console.log("Complete profile:", data);

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
        px-4
        py-10
      "
    >
      {/* Background */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div
          className="
            absolute
            right-[-10%]
            top-[-10%]
            h-105
            w-105
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
            h-105
            w-105
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

      <Card
        className="
          w-full
          max-w-130
          border-border/60
          bg-card/95
          shadow-2xl
          backdrop-blur-xl
        "
      >
        <CardContent className="p-8 md:p-10">
          {/* Logo */}
          <div className="mb-10 text-center">
            <span
              className="
                bg-linear-to-r
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

          {/* Google Profile */}
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="relative mb-5">
              <div
                className="
                  h-24
                  w-24
                  overflow-hidden
                  rounded-full
                  border-2
                  border-primary/40
                  bg-muted
                  p-1
                  shadow-lg
                "
              >
                <img
                  src="https://i.pravatar.cc/300"
                  alt="Profile"
                  className="h-full w-full rounded-full object-cover"
                />
              </div>

              <div
                className="
                  absolute
                  bottom-0
                  right-0
                  flex
                  h-8
                  w-8
                  items-center
                  justify-center
                  rounded-full
                  border
                  border-border
                  bg-card
                  shadow-md
                "
              >
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />

                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />

                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />

                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
              </div>
            </div>

            <h2 className="text-xl font-semibold text-foreground">
              Alex Rivera
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              alex.rivera.dev@gmail.com
            </p>
          </div>

          {/* Heading */}
          <div className="mb-10 text-center">
            <h1
              className="
                text-3xl
                font-bold
                tracking-tight
                text-foreground
              "
            >
              Ya casi estás dentro
            </h1>

            <p
              className="
                mt-3
                text-sm
                leading-relaxed
                text-muted-foreground
              "
            >
              Elige tu nombre de usuario para identificarte
              dentro de Studeo.
            </p>
          </div>

          {/* Form */}
          <CompleteProfileForm
            defaultUsername="alexdev"
            onSubmit={handleCompleteProfile}
          />

          {/* Footer */}
          <p
            className="
              mt-8
              text-center
              text-xs
              text-muted-foreground
            "
          >
            Podrás cambiar esto más tarde desde tu perfil.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default CompleteProfilePage;
