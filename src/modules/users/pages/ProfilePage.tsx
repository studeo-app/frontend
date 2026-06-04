import { useMemo, useState } from "react";
import { Link } from "react-router";
import { useAuthStore } from "@/stores/useAuthStore";
import { useForm } from "@/shared/hooks/useForm";
import { Input } from "@/shared/components/ui/Input";
import { Button } from "@/shared/components/ui/Button";
import { Card } from "@/shared/components/ui/Card";
import { SuccessModal } from "@/shared/components/ui/SuccessModal";
import { ErrorModal } from "@/shared/components/ui/ErrorModal";
import { ConfirmModal } from "@/shared/components/ui/ConfirmModal";
import { ReauthModal } from "@/shared/components/ui/ReauthModal";
import { ProfileAvatarCarousel } from "@/modules/auth/components/ProfileAvatarCarousel";
import { useUsernameAvailability } from "@/modules/auth/hooks/useUsernameAvailability";
import useDocumentTitle from "@/shared/hooks/useDocumentTitle";
import { AlertCircle, ArrowLeft, CheckCircle2, Save, X } from "lucide-react";

export default function ProfilePage() {
  useDocumentTitle("Perfil - Studeo");
  const { profile, user: firebaseUser, updateProfileData, deleteAccountAction } = useAuthStore();

  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isErrorOpen, setIsErrorOpen] = useState(false);

  // Deletion modals state
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Save changes modal state
  const [isSaveConfirmOpen, setIsSaveConfirmOpen] = useState(false);

  // Reauth modal state
  const [isReauthOpen, setIsReauthOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<"update" | "delete" | null>(null);

  // Toast banner dismissed state
  const [toastDismissed, setToastDismissed] = useState(false);

  const initialUsername = profile?.username ?? "";
  const initialEmail = profile?.email ?? firebaseUser?.email ?? "";
  const authProvider = profile?.authProvider ?? "password";

  const {
    fields,
    handleBlur,
    validateAll,
    getFieldError,
    shouldShowFieldError,
    setFieldValue,
    handleChange,
  } = useForm({
    firstName: {
      value: profile?.firstName ?? "",
      rules: { required: true },
    },
    lastName: {
      value: profile?.lastName ?? "",
      rules: { required: true },
    },
    username: {
      value: initialUsername,
      rules: {
        required: true,
        minLength: 4,
        custom: (value) => {
          if (value.length > 20) return "Máximo 20 caracteres";
          if (/\s/.test(value)) return "No puede contener espacios";
          if (!/^[a-zA-Z0-9_]+$/.test(value)) {
            return "Solo letras, números y guiones bajos";
          }
          return undefined;
        },
      },
    },
    email: {
      value: initialEmail,
      rules: {
        required: true,
        email: true,
      },
    },
    avatarUrl: {
      value: profile?.avatarUrl ?? firebaseUser?.photoURL ?? "",
      rules: { required: true },
    },
  });

  const [showErrors, setShowErrors] = useState(false);

  const firstNameError = getFieldError("firstName", showErrors);
  const lastNameError = getFieldError("lastName", showErrors);
  const usernameError = getFieldError("username", showErrors);
  const emailError = getFieldError("email", showErrors);

  const usernameFormatValid =
    fields.username.value.trim().length >= 4 && !usernameError;

  const usernameHasChanged =
    fields.username.value.trim().toLowerCase() !== initialUsername.toLowerCase();

  const { checking: checkingUsername, available: usernameAvailable, error: usernameCheckError } =
    useUsernameAvailability(fields.username.value, usernameFormatValid && usernameHasChanged);

  const isUsernameValid = useMemo(() => {
    if (!usernameHasChanged) return true;
    return usernameFormatValid && usernameAvailable === true && !checkingUsername;
  }, [usernameHasChanged, usernameFormatValid, usernameAvailable, checkingUsername]);

  const hasValidationErrors = useMemo(() => {
    return (
      !!firstNameError ||
      !!lastNameError ||
      !!usernameError ||
      !!emailError ||
      !isUsernameValid
    );
  }, [firstNameError, lastNameError, usernameError, emailError, isUsernameValid]);

  // Form dirty state check to show the toast banner
  const isDirty = useMemo(() => {
    const dirty =
      fields.firstName.value !== (profile?.firstName ?? "") ||
      fields.lastName.value !== (profile?.lastName ?? "") ||
      fields.username.value !== initialUsername ||
      fields.email.value !== initialEmail ||
      fields.avatarUrl.value !== (profile?.avatarUrl ?? firebaseUser?.photoURL ?? "");
    
    return dirty;
  }, [fields, profile, firebaseUser, initialUsername, initialEmail]);

  const getChangedFields = () => {
    const changes = [];
    if (fields.firstName.value.trim() !== (profile?.firstName ?? "")) {
      changes.push({ label: "Nombre", old: profile?.firstName ?? "No especificado", new: fields.firstName.value.trim() });
    }
    if (fields.lastName.value.trim() !== (profile?.lastName ?? "")) {
      changes.push({ label: "Apellidos", old: profile?.lastName ?? "No especificado", new: fields.lastName.value.trim() });
    }
    if (fields.username.value.trim().toLowerCase() !== initialUsername.toLowerCase()) {
      changes.push({ label: "Username", old: initialUsername ? `@${initialUsername}` : "Ninguno", new: `@${fields.username.value.trim().toLowerCase()}` });
    }
    if (fields.email.value.trim().toLowerCase() !== initialEmail.toLowerCase()) {
      changes.push({ label: "Correo Electrónico", old: initialEmail || "Ninguno", new: fields.email.value.trim().toLowerCase() });
    }
    if (fields.avatarUrl.value.trim() !== (profile?.avatarUrl ?? firebaseUser?.photoURL ?? "")) {
      changes.push({ label: "Avatar", old: "Foto anterior", new: "Nueva foto seleccionada" });
    }
    return changes;
  };

  const handleAvatarChange = ({ secureUrl }: { secureUrl: string }) => {
    setFieldValue("avatarUrl", secureUrl);
  };

  const checkNeedsReauth = (): boolean => {
    const lastSignInTime = firebaseUser?.metadata.lastSignInTime;
    if (!lastSignInTime) return true;
    return Date.now() - new Date(lastSignInTime).getTime() > 5 * 60 * 1000;
  };

  const executeUpdate = async () => {
    try {
      await updateProfileData({
        firstName: fields.firstName.value.trim(),
        lastName: fields.lastName.value.trim(),
        username: fields.username.value.trim().toLowerCase(),
        email: fields.email.value.trim().toLowerCase(),
        avatarUrl: fields.avatarUrl.value.trim() || undefined,
      });
      setSuccessMessage("Tu perfil ha sido actualizado con éxito.");
      setIsSuccessOpen(true);
      setShowErrors(false);
      setToastDismissed(false);
    } catch (err: any) {
      if (err.code === "auth/requires-recent-login" || err.message?.includes("recent-login")) {
        setPendingAction("update");
        setIsReauthOpen(true);
      } else {
        setErrorMsg(err.message || "Error al actualizar perfil.");
        setIsErrorOpen(true);
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowErrors(true);

    if (!validateAll() || hasValidationErrors) {
      return;
    }

    setIsSaveConfirmOpen(true);
  };

  const handleSaveConfirm = async () => {
    setIsSaveConfirmOpen(false);
    const emailChanged = fields.email.value.trim().toLowerCase() !== initialEmail.toLowerCase();
    if (emailChanged && authProvider === "password" && checkNeedsReauth()) {
      setPendingAction("update");
      setIsReauthOpen(true);
      return;
    }

    await executeUpdate();
  };

  const executeDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteAccountAction();
      setSuccessMessage("Tu cuenta ha sido eliminada permanentemente.");
      setIsSuccessOpen(true);
    } catch (err: any) {
      if (err.code === "auth/requires-recent-login" || err.message?.includes("recent-login") || err.code === "REQUIRES_RECENT_LOGIN") {
        setPendingAction("delete");
        setIsReauthOpen(true);
      } else {
        setErrorMsg(err.message || "Error al eliminar la cuenta.");
        setIsErrorOpen(true);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    setIsDeleteConfirmOpen(false);

    if (checkNeedsReauth()) {
      setPendingAction("delete");
      setIsReauthOpen(true);
      return;
    }

    await executeDelete();
  };

  const handleReauthSuccess = async () => {
    setIsReauthOpen(false);
    const action = pendingAction;
    setPendingAction(null);

    if (action === "update") {
      await executeUpdate();
    } else if (action === "delete") {
      await executeDelete();
    }
  };

  const googlePhotoUrl = useMemo(() => {
    const googleProvider = firebaseUser?.providerData.find(
      (p) => p.providerId === "google.com"
    );
    return googleProvider?.photoURL || undefined;
  }, [firebaseUser]);

  return (
    <section className="space-y-6">
      {/* Back to Dashboard link */}
      <div>
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-auth-label hover:text-auth-title transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-3 w-3" />
          Volver al Dashboard
        </Link>
      </div>

      {/* Main Title */}
      <h1 className="text-2xl font-bold tracking-tight text-auth-title sm:text-3xl">
        Ajustes de Perfil
      </h1>

      <div className="grid gap-6 md:grid-cols-[280px_1fr]">
        {/* Left Card: Avatar & Name */}
        <Card className="flex flex-col items-center p-6 bg-auth-surface border-auth-input-border rounded-2xl h-fit">
          <ProfileAvatarCarousel
            displayName={`${profile?.firstName || ""} ${profile?.lastName || ""}`}
            userId={profile?.uid}
            initialExternalUrl={googlePhotoUrl}
            value={fields.avatarUrl.value}
            onChange={handleAvatarChange}
          />
          <h2 className="mt-4 text-center text-lg font-bold text-auth-title">
            {profile ? `${profile.firstName} ${profile.lastName}` : "Usuario Pro"}
          </h2>
        </Card>

        {/* Right Columns */}
        <div className="flex flex-col gap-6">
          {/* General Information Card */}
          <Card className="p-6 bg-auth-surface border-auth-input-border rounded-2xl">
            <h3 className="mb-5 text-base font-bold text-auth-title">
              Información General
            </h3>

            <form onSubmit={handleSave} className="space-y-4" noValidate>
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Nombre */}
                <div>
                  <label htmlFor="firstName" className="mb-1 block text-xs text-auth-label">
                    Nombre
                  </label>
                  <div className="relative">
                    <Input
                      id="firstName"
                      name="firstName"
                      value={fields.firstName.value}
                      onChange={handleChange}
                      onBlur={() => handleBlur("firstName")}
                      error={shouldShowFieldError("firstName", showErrors) ? firstNameError : undefined}
                      className="h-11 rounded-xl pr-10"
                      required
                    />
                    {!firstNameError && fields.firstName.value.trim() && (
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 fill-emerald-500/10" />
                      </span>
                    )}
                  </div>
                </div>

                {/* Apellidos */}
                <div>
                  <label htmlFor="lastName" className="mb-1 block text-xs text-auth-label">
                    Apellidos
                  </label>
                  <div className="relative">
                    <Input
                      id="lastName"
                      name="lastName"
                      value={fields.lastName.value}
                      onChange={handleChange}
                      onBlur={() => handleBlur("lastName")}
                      error={shouldShowFieldError("lastName", showErrors) ? lastNameError : undefined}
                      className="h-11 rounded-xl pr-10"
                      required
                    />
                    {!lastNameError && fields.lastName.value.trim() && (
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 fill-emerald-500/10" />
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {/* Username */}
                <div>
                  <label htmlFor="username" className="mb-1 block text-xs text-auth-label">
                    Username
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-auth-label" aria-hidden="true">
                      @
                    </span>
                    <Input
                      id="username"
                      name="username"
                      value={fields.username.value}
                      onChange={(e) => setFieldValue("username", e.target.value.toLowerCase())}
                      onBlur={() => handleBlur("username")}
                      error={shouldShowFieldError("username", showErrors) ? usernameError : undefined}
                      className="h-11 pl-9 pr-10 rounded-xl"
                      required
                    />
                    {isUsernameValid && fields.username.value.trim() && (
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 fill-emerald-500/10" />
                      </span>
                    )}
                  </div>
                  {/* Real-time username states */}
                  {usernameFormatValid && usernameHasChanged && (
                    <div className="mt-1 px-1 text-[11px]">
                      {checkingUsername && (
                        <span className="text-auth-label">Comprobando disponibilidad...</span>
                      )}
                      {!checkingUsername && usernameAvailable === false && (
                        <span className="text-auth-error font-medium">Este nombre de usuario ya está en uso.</span>
                      )}
                      {!checkingUsername && usernameAvailable === true && (
                        <span className="text-auth-link font-medium">¡Nombre de usuario disponible!</span>
                      )}
                      {usernameCheckError && (
                        <span className="text-auth-error">{usernameCheckError}</span>
                      )}
                    </div>
                  )}
                  <p className="mt-1.5 text-[11px] text-auth-label">
                    Este nombre será visible para otros estudiantes en las salas.
                  </p>
                </div>

                {/* Correo Electrónico */}
                <div>
                  <label htmlFor="email" className="mb-1 block text-xs text-auth-label">
                    Correo Electrónico
                  </label>
                  <div className="relative">
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={fields.email.value}
                      onChange={handleChange}
                      onBlur={() => handleBlur("email")}
                      error={shouldShowFieldError("email", showErrors) ? emailError : undefined}
                      disabled={authProvider === "google"}
                      className="h-11 rounded-xl pr-10"
                      required
                    />
                    {!emailError && fields.email.value.trim() && (
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 fill-emerald-500/10" />
                      </span>
                    )}
                  </div>
                  {authProvider === "google" && (
                    <p className="mt-1.5 flex items-start gap-1 text-[11px] leading-tight text-auth-label">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                      Los usuarios autenticados mediante Google no pueden modificar su correo electrónico desde la aplicación.
                    </p>
                  )}
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-3">
                <Button
                  type="submit"
                  variant="primary"
                  disabled={!isDirty || hasValidationErrors || checkingUsername}
                  className="h-10 px-5 rounded-xl flex items-center gap-2 cursor-pointer"
                >
                  <Save className="h-4 w-4" />
                  Guardar Cambios
                </Button>
              </div>
            </form>
          </Card>

          {/* Danger Zone Card */}
          <Card className="p-6 bg-auth-surface border-auth-input-border rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-auth-error flex items-center gap-1.5">
                <AlertCircle className="h-5 w-5 text-auth-error" />
                Zona de Peligro
              </h3>
              <p className="text-xs text-auth-label max-w-xl leading-relaxed">
                Una vez que elimines tu cuenta, no hay marcha atrás. Todos tus datos, historial de estudio y logros se perderán permanentemente.
              </p>
            </div>

            <div>
              <button
                type="button"
                onClick={() => setIsDeleteConfirmOpen(true)}
                disabled={isDeleting}
                className="w-full sm:w-auto h-10 px-5 rounded-xl border border-auth-error/40 text-auth-error bg-transparent hover:bg-auth-error/10 font-semibold transition text-xs cursor-pointer"
              >
                Eliminar mi cuenta
              </button>
            </div>
          </Card>
        </div>
      </div>

      {/* Floating Changes Detected Banner */}
      {isDirty && !toastDismissed && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center justify-between gap-4 rounded-xl border border-auth-input-border bg-auth-surface p-4 shadow-2xl animate-scale-up min-w-[320px]">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-500 fill-emerald-500/10" />
            <div>
              <p className="text-xs font-bold text-auth-title">Cambios detectados</p>
              <p className="text-[11px] text-auth-label">No olvides guardar tu progreso.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setToastDismissed(true)}
            aria-label="Cerrar aviso"
            className="rounded-lg p-1 text-auth-label hover:bg-auth-input-bg hover:text-auth-title transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Confirmation modal for saving changes */}
      <ConfirmModal
        isOpen={isSaveConfirmOpen}
        onClose={() => setIsSaveConfirmOpen(false)}
        onConfirm={handleSaveConfirm}
        title="Confirmar Cambios"
        warning
        confirmText="Guardar"
        cancelText="Cancelar"
        message={
          <div className="space-y-3">
            <p className="text-sm text-auth-label">¿Estás seguro de que deseas guardar los siguientes cambios?</p>
            <div className="rounded-xl bg-auth-input-bg/50 border border-auth-input-border p-3 space-y-2 text-xs">
              {getChangedFields().map((c, i) => (
                <div key={i} className="flex justify-between border-b border-auth-input-border/30 pb-1.5 last:border-0 last:pb-0">
                  <span className="font-semibold text-auth-label">{c.label}:</span>
                  <span className="text-auth-title text-right">
                    <span className="line-through text-auth-label mr-2">{c.old}</span>
                    <span className="text-auth-link font-medium">→ {c.new}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        }
      />

      {/* Confirmation modal for account deletion */}
      <ConfirmModal
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="¿Eliminar cuenta permanentemente?"
        critical
        confirmText="Sí, eliminar cuenta"
        cancelText="Cancelar"
        message={
          <div className="space-y-3">
            <p className="text-sm font-semibold text-auth-error">
              Por favor lee con atención las consecuencias de esta acción:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs text-auth-label">
              <li>Pérdida permanente de todos tus datos, perfiles y configuraciones.</li>
              <li>Cierre inmediato del acceso a la plataforma.</li>
              <li>Imposibilidad absoluta de recuperar tu cuenta en el futuro.</li>
            </ul>
            <p className="text-xs text-auth-label font-medium pt-2">
              ¿Estás seguro de que deseas continuar?
            </p>
          </div>
        }
      />

      {/* Reauthentication Modal */}
      <ReauthModal
        isOpen={isReauthOpen}
        onClose={() => {
          setIsReauthOpen(false);
          setPendingAction(null);
        }}
        onSuccess={handleReauthSuccess}
        authProvider={authProvider}
      />

      {/* Success Notification dialog */}
      <SuccessModal
        isOpen={isSuccessOpen}
        onClose={() => {
          setIsSuccessOpen(false);
          if (successMessage.includes("eliminada")) {
            window.location.href = "/login";
          }
        }}
        message={successMessage}
      />

      {/* Error dialog */}
      <ErrorModal
        isOpen={isErrorOpen}
        onClose={() => setIsErrorOpen(false)}
        title="Algo salió mal"
        message={errorMsg || ""}
      />
    </section>
  );
}
