import React, { useCallback } from "react";
import { useNavigate } from "react-router";
import { DEFAULT_PROFILE_AVATARS } from "@/assets/defaultProfileAvatars";
import { useAuthStore } from "@/stores/useAuthStore";
import { AuthPageLayout } from "../components/AuthPageLayout";
import { CompleteProfileForm } from "../components/CompleteProfileForm";
import { authClasses } from "../theme/authTheme";
import { resolveCompleteProfileErrorMessage } from "../utils/completeProfileErrors";

const CompleteProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const suggestedProfile = useAuthStore((s) => s.suggestedProfile);
  const authProvider = useAuthStore((s) => s.authProvider);
  const completeProfile = useAuthStore((s) => s.completeProfile);

  const displayName =
    profile?.firstName && profile?.lastName
      ? `${profile.firstName} ${profile.lastName}`
      : suggestedProfile
        ? `${suggestedProfile.firstName} ${suggestedProfile.lastName}`.trim()
        : user?.displayName ?? "Usuario";

  const email =
    profile?.email ?? suggestedProfile?.email ?? user?.email ?? "";

  const initialAvatarUrl =
    authProvider === "google"
      ? suggestedProfile?.avatarUrl ?? user?.photoURL ?? profile?.avatarUrl ?? ""
      : DEFAULT_PROFILE_AVATARS[0]?.src ?? "";

  const defaultUsername =
    profile?.username ??
    user?.displayName?.replace(/\s+/g, "").toLowerCase() ??
    "";

  const handleCompleteProfile = useCallback(
    async (data: { username: string; avatarUrl?: string }) => {
      try {
        await completeProfile(data);
        navigate("/dashboard");
      } catch (err: unknown) {
        throw new Error(resolveCompleteProfileErrorMessage(err));
      }
    },
    [completeProfile, navigate]
  );

  if (!authProvider) {
    return (
      <AuthPageLayout>
        <p className={authClasses.subtitle}>Cargando tu perfil…</p>
      </AuthPageLayout>
    );
  }

  return (
    <AuthPageLayout className="items-stretch justify-start py-5 sm:py-6">
      <div className="mx-auto w-full max-w-[420px] px-1">
        <div className="mb-4">
          <span
            className={`${authClasses.logo} text-3xl font-bold tracking-tight`}
          >
            Studeo
          </span>
        </div>

        <div className="mb-6 text-center">
          <h1
            className={`${authClasses.title} text-2xl font-bold tracking-tight sm:text-3xl`}
          >
            Ya casi estás dentro
          </h1>
          <p
            className={`${authClasses.subtitle} mx-auto mt-3 max-w-sm text-sm leading-relaxed sm:text-base`}
          >
            Elige tu nombre de usuario y tu foto de perfil (o sube una propia) para que otros te identifiquen en Studeo.
          </p>
        </div>

        <CompleteProfileForm
          authProvider={authProvider}
          displayName={displayName}
          email={email}
          userId={user?.uid}
          defaultUsername={defaultUsername}
          defaultAvatarUrl={initialAvatarUrl}
          onSubmit={handleCompleteProfile}
        />

        <p className={`${authClasses.footer} mt-8 text-center`}>
          Podrás cambiar tu nombre de usuario en cualquier momento desde los
          ajustes.
        </p>
      </div>
    </AuthPageLayout>
  );
};

export default CompleteProfilePage;
