import { useMemo, useState } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import { useForm } from "@/shared/hooks/useForm";
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth";
import { Input } from "@/shared/components/ui/Input";
import { Card } from "@/shared/components/ui/Card";
import { SuccessModal } from "@/shared/components/ui/SuccessModal";
import { ErrorModal } from "@/shared/components/ui/ErrorModal";
import { ConfirmModal } from "@/shared/components/ui/ConfirmModal";
import { ReauthModal } from "@/shared/components/ui/ReauthModal";
import { ProfileAvatarCarousel } from "@/modules/auth/components/ProfileAvatarCarousel";
import { useUsernameAvailability } from "@/modules/auth/hooks/useUsernameAvailability";
import { usePasswordValidation } from "@/shared/hooks/usePasswordValidation";
import { checkEmailAvailability } from "@/modules/users/api/usersApi";
import { getApiErrorMessage } from "@/shared/api/apiError";
import { auth } from "@/config/firebase.config";
import useDocumentTitle from "@/shared/hooks/useDocumentTitle";
import { AlertCircle, CheckCircle2, RefreshCw, Save, UserX, X } from "lucide-react";

export default function ProfilePage() {
  useDocumentTitle("Perfil - Studeo");
  const {
    profile,
    user: firebaseUser,
    updateProfileData,
    deleteAccountAction,
    loading,
    profileLoadError,
    retryLoadProfile,
  } = useAuthStore();

  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [successTitle, setSuccessTitle] = useState("¡Vamos bien!");
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [errorTitle, setErrorTitle] = useState("Algo salió mal");
  const [isErrorOpen, setIsErrorOpen] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isEditingMode, setIsEditingMode] = useState(false);

  // Deletion modals state
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  // Save changes modal state
  const [isSaveConfirmOpen, setIsSaveConfirmOpen] = useState(false);

  // Reauth modal state
  const [isReauthOpen, setIsReauthOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<"update" | "delete" | null>(null);

  // Toast banner dismissed state
  const [toastDismissed, setToastDismissed] = useState(false);

  // Password change state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });
  const [passwordErrors, setPasswordErrors] = useState({
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });
  const [passwordLoading, setPasswordLoading] = useState(false);

  const {
    validation: passwordValidation,
    passwordsMatch: passwordFormMatches,
  } = usePasswordValidation(
    passwordForm.newPassword,
    passwordForm.confirmNewPassword
  );

  const [passwordFocused, setPasswordFocused] = useState(false);

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
        custom: (value) => {
          if (!value.trim()) return undefined;
          const domain = value.toLowerCase().split("@")[1] ?? "";
          if (domain && !/\.edu(\.[a-z]{2,})?$/.test(domain)) {
            return "Debes usar un correo institucional (.edu)";
          }
          return undefined;
        },
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
      !!emailError
    );
  }, [firstNameError, lastNameError, usernameError, emailError]);

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

  const handlePasswordFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordForm((prev) => ({ ...prev, [name]: value }));
    setPasswordErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors = {
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    };

    if (!passwordForm.currentPassword.trim()) {
      errors.currentPassword = "La contraseña actual es obligatoria.";
    }
    if (!passwordForm.newPassword.trim()) {
      errors.newPassword = "La nueva contraseña es obligatoria.";
    } else if (!passwordValidation.isValid) {
      errors.newPassword = "La nueva contraseña no cumple con los requisitos mínimos.";
    }
    if (!passwordForm.confirmNewPassword.trim()) {
      errors.confirmNewPassword = "Debes confirmar tu nueva contraseña.";
    } else if (!passwordFormMatches) {
      errors.confirmNewPassword = "La nueva contraseña y la confirmación no coinciden.";
    }

    if (errors.currentPassword || errors.newPassword || errors.confirmNewPassword) {
      setPasswordErrors(errors);
      return;
    }

    setPasswordLoading(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser || !currentUser.email) {
        throw new Error("No hay una sesión activa de usuario.");
      }

      // 1. Reauthenticate user using direct auth.currentUser reference to avoid proxy/re-render method failures
      const credential = EmailAuthProvider.credential(currentUser.email, passwordForm.currentPassword);
      await reauthenticateWithCredential(currentUser, credential);

      // 2. Update password
      await updatePassword(currentUser, passwordForm.newPassword);

      setSuccessTitle("Contraseña actualizada");
      setSuccessMessage("Tu contraseña ha sido actualizada con éxito.");
      setIsSuccessOpen(true);
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmNewPassword: "",
      });
      setPasswordErrors({
        currentPassword: "",
        newPassword: "",
        confirmNewPassword: "",
      });
    } catch (err: any) {
      let friendlyMsg = err.message || "Error al actualizar la contraseña.";
      if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password") {
        friendlyMsg = "La contraseña actual ingresada es incorrecta.";
        setPasswordErrors((prev) => ({ ...prev, currentPassword: friendlyMsg }));
      } else if (err.code === "auth/weak-password") {
        friendlyMsg = "La nueva contraseña es muy débil. Intenta usar más caracteres y símbolos.";
        setPasswordErrors((prev) => ({ ...prev, newPassword: friendlyMsg }));
      } else {
        showErrorModal(friendlyMsg, "No se pudo actualizar la contraseña");
      }
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setFieldValue("firstName", profile?.firstName ?? "");
    setFieldValue("lastName", profile?.lastName ?? "");
    setFieldValue("username", initialUsername);
    setFieldValue("email", initialEmail);
    setFieldValue("avatarUrl", profile?.avatarUrl ?? firebaseUser?.photoURL ?? "");
    setIsEditingMode(false);
    setShowErrors(false);
  };

  const showErrorModal = (message: string, title = "Algo salió mal") => {
    setErrorTitle(title);
    setErrorMsg(message);
    setIsErrorOpen(true);
  };

  const checkNeedsReauth = (): boolean => {
    const lastSignInTime = firebaseUser?.metadata.lastSignInTime;
    if (!lastSignInTime) return true;
    return Date.now() - new Date(lastSignInTime).getTime() > 5 * 60 * 1000;
  };

  const resolveProfileUpdateError = (err: unknown): string => {
    const firebaseErr = err as { code?: string; message?: string };
    let friendlyMsg = getApiErrorMessage(
      err,
      "No pudimos guardar tus cambios. Inténtalo de nuevo."
    );

    const isEmailError =
      firebaseErr.code === "auth/email-already-in-use" ||
      friendlyMsg.includes("email-already-in-use") ||
      friendlyMsg.toLowerCase().includes("email is already in use") ||
      friendlyMsg.toLowerCase().includes("email_already_in_use") ||
      (friendlyMsg.toLowerCase().includes("correo") &&
        friendlyMsg.toLowerCase().includes("registrado"));

    const isUsernameError =
      friendlyMsg.includes("Username is already taken") ||
      (friendlyMsg.toLowerCase().includes("username") &&
        friendlyMsg.toLowerCase().includes("taken")) ||
      friendlyMsg.toLowerCase().includes("username_taken") ||
      (friendlyMsg.toLowerCase().includes("nombre de usuario") &&
        friendlyMsg.toLowerCase().includes("registrado"));

    if (isEmailError) {
      return "El correo electrónico institucional ingresado ya está registrado por otro usuario.";
    }
    if (isUsernameError) {
      return "El nombre de usuario ya está registrado por otra persona. Por favor elige otro.";
    }

    return friendlyMsg;
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
      setSuccessTitle("Cambios guardados");
      setSuccessMessage("Tus cambios se han guardado correctamente.");
      setIsSuccessOpen(true);
      setShowErrors(false);
      setToastDismissed(false);
      setIsEditingMode(false);
    } catch (err: unknown) {
      const firebaseErr = err as { code?: string; message?: string };
      if (
        firebaseErr.code === "auth/requires-recent-login" ||
        firebaseErr.message?.includes("recent-login")
      ) {
        setPendingAction("update");
        setIsReauthOpen(true);
        return;
      }

      showErrorModal(
        resolveProfileUpdateError(err),
        "No se pudieron guardar los cambios"
      );
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowErrors(true);

    if (!validateAll() || hasValidationErrors) {
      return;
    }

    if (usernameHasChanged && usernameAvailable === false) {
      showErrorModal(
        "El nombre de usuario ya está registrado por otra persona. Por favor elige otro.",
        "No se pudieron guardar los cambios"
      );
      return;
    }

    const emailChanged = fields.email.value.trim().toLowerCase() !== initialEmail.toLowerCase();
    if (emailChanged) {
      try {
        const check = await checkEmailAvailability(fields.email.value);
        if (check.available === false) {
          showErrorModal(
            "El correo electrónico institucional ingresado ya está registrado por otro usuario.",
            "No se pudieron guardar los cambios"
          );
          return;
        }
      } catch (err) {
        console.warn("No se pudo comprobar la disponibilidad del correo:", err);
      }
    }

    setIsSaveConfirmOpen(true);
  };

  const handleSaveConfirm = async () => {
    const emailChanged =
      fields.email.value.trim().toLowerCase() !== initialEmail.toLowerCase();

    if (emailChanged && authProvider === "password") {
      setIsSaveConfirmOpen(false);
      setPendingAction("update");
      setIsReauthOpen(true);
      return;
    }

    setIsSavingProfile(true);
    try {
      await executeUpdate();
      setIsSaveConfirmOpen(false);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const executeDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteAccountAction();
      setSuccessTitle("Cuenta eliminada");
      setSuccessMessage("Tu cuenta ha sido eliminada permanentemente.");
      setIsSuccessOpen(true);
    } catch (err: any) {
      if (err.code === "auth/requires-recent-login" || err.message?.includes("recent-login") || err.code === "REQUIRES_RECENT_LOGIN") {
        setPendingAction("delete");
        setIsReauthOpen(true);
      } else {
        showErrorModal(
          err.message || "Error al eliminar la cuenta.",
          "No se pudo eliminar la cuenta"
        );
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
      setIsSavingProfile(true);
      try {
        await executeUpdate();
      } finally {
        setIsSavingProfile(false);
      }
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

  if (loading && !profile && !profileLoadError) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto animate-pulse">
        {/* Banner skeleton */}
        <div className="relative overflow-hidden bg-auth-surface border border-auth-input-border rounded-2xl p-6 shadow-md h-44 flex items-end gap-6">
          <div className="h-32 w-32 rounded-full bg-auth-input-bg/50 shrink-0" />
          <div className="space-y-2 flex-1 pb-4">
            <div className="h-6 bg-auth-input-bg/50 rounded w-1/3" />
            <div className="h-4 bg-auth-input-bg/50 rounded w-1/4" />
          </div>
        </div>
        
        {/* Form card skeleton */}
        <div className="p-6 bg-auth-surface border border-auth-input-border rounded-2xl shadow-md space-y-6">
          <div className="flex justify-between items-center border-b border-auth-input-border/60 pb-4">
            <div className="space-y-2 w-1/3">
              <div className="h-5 bg-auth-input-bg/50 rounded" />
              <div className="h-3 bg-auth-input-bg/50 rounded w-2/3" />
            </div>
            <div className="h-10 bg-auth-input-bg/50 rounded-xl w-32" />
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="space-y-2">
                <div className="h-4 bg-auth-input-bg/50 rounded w-1/4" />
                <div className="h-11 bg-auth-input-bg/50 rounded-xl" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (profileLoadError && !profile) {
    return (
      <section className="mx-auto max-w-4xl">
        <div
          className="relative flex min-h-[min(70vh,520px)] flex-col items-center justify-center rounded-3xl border border-auth-error/25 bg-auth-surface px-6 py-16 text-center shadow-sm animate-scale-up overflow-hidden"
          role="alert"
          aria-labelledby="profile-error-title"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-gradient-to-b from-auth-error/8 via-transparent to-transparent"
          />

          <div className="relative mb-8 flex h-24 w-24 items-center justify-center rounded-full border border-auth-error/20 bg-auth-error/10 text-auth-error shadow-lg shadow-auth-error/10">
            <UserX className="h-11 w-11" strokeWidth={1.75} />
          </div>

          <div className="relative max-w-lg space-y-4">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-auth-label">
              Error al cargar perfil
            </p>
            <h2
              id="profile-error-title"
              className="text-3xl font-extrabold tracking-tight text-auth-title sm:text-4xl"
            >
              No pudimos obtener tus datos
            </h2>
            <p className="mx-auto max-w-md text-base leading-relaxed text-auth-label sm:text-lg">
              {profileLoadError}
            </p>
            <p className="mx-auto max-w-md text-sm text-auth-label">
              Tu sesión sigue activa, pero no pudimos conectar con la base de
              datos para mostrar tu perfil.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void retryLoadProfile()}
            disabled={loading}
            className="relative mt-10 inline-flex h-12 items-center justify-center gap-2.5 rounded-2xl bg-auth-btn px-8 text-base font-semibold text-auth-btn-text shadow-lg shadow-auth-btn/20 transition hover:brightness-110 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-auth-btn focus-visible:ring-offset-2 focus-visible:ring-offset-auth-bg cursor-pointer"
          >
            {loading ? (
              <>
                <svg
                  className="h-5 w-5 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                  role="status"
                  aria-label="Reintentando..."
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.37 0 0 5.37 0 12h4z"
                  />
                </svg>
                Reintentando...
              </>
            ) : (
              <>
                <RefreshCw className="h-5 w-5" aria-hidden="true" />
                Reintentar
              </>
            )}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6 max-w-4xl mx-auto">
      {/* Profile Header Banner Card */}
      <Card className="relative overflow-hidden bg-auth-surface border-auth-input-border rounded-2xl p-6 shadow-md">
        {/* Banner background graphic */}
        <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-r from-auth-btn/20 to-auth-btn/5" />

        <div className="relative pt-8 flex flex-col md:flex-row items-center md:items-end justify-between gap-6">
          <div className="flex flex-col md:flex-row items-center md:items-end gap-6 flex-1">
            <div className="shrink-0">
              <ProfileAvatarCarousel
                displayName={`${profile?.firstName || ""} ${profile?.lastName || ""}`}
                userId={profile?.uid}
                initialExternalUrl={googlePhotoUrl}
                value={fields.avatarUrl.value}
                disabled={!isEditingMode}
                onChange={handleAvatarChange}
              />
            </div>
            <div className="text-center md:text-left flex-1">
              <h1 className="text-2xl font-extrabold text-auth-title tracking-tight">
                {profile ? `${profile.firstName} ${profile.lastName}` : "Usuario Pro"}
              </h1>
              <p className="text-sm text-auth-label font-medium mt-0.5">
                {fields.username.value ? `@${fields.username.value}` : profile?.email ?? firebaseUser?.email}
              </p>
              <div className="mt-2 flex flex-wrap justify-center md:justify-start gap-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-auth-btn/10 text-auth-btn">
                  Estudiante
                </span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-auth-input-bg text-auth-label border border-auth-input-border">
                  {authProvider === "google" ? "Google Auth" : "Correo y Contraseña"}
                </span>
              </div>
            </div>
          </div>
          <div className="w-full md:w-auto flex items-center justify-center md:justify-end gap-2 shrink-0">
            {!isEditingMode ? (
              <button
                type="button"
                onClick={() => setIsEditingMode(true)}
                className="w-full sm:w-auto h-10 px-6 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md hover:scale-[1.02] active:scale-[0.98] bg-auth-btn text-auth-btn-text focus-visible:ring-2 focus-visible:ring-auth-btn focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                Editar Perfil
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="w-full sm:w-auto h-10 px-6 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all border border-auth-input-border hover:bg-auth-input-bg text-auth-label focus-visible:ring-2 focus-visible:ring-auth-btn focus-visible:ring-offset-2 focus-visible:outline-none"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  form="profile-form"
                  disabled={isSavingProfile || !isDirty || hasValidationErrors}
                  aria-describedby={(!isDirty || hasValidationErrors) ? "save-disabled-desc" : undefined}
                  className="w-full sm:w-auto h-10 px-6 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 bg-auth-btn text-auth-btn-text focus-visible:ring-2 focus-visible:ring-auth-btn focus-visible:ring-offset-2 focus-visible:outline-none"
                >
                  {isSavingProfile ? (
                    <>
                      <svg
                        className="animate-spin h-4 w-4 text-current"
                        viewBox="0 0 24 24"
                        fill="none"
                        role="status"
                        aria-label="Guardando..."
                      >
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.37 0 0 5.37 0 12h4z" />
                      </svg>
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" aria-hidden="true" />
                      <span>Guardar Cambios</span>
                    </>
                  )}
                </button>
              </>
            )}
            {isEditingMode && (!isDirty || hasValidationErrors) && (
              <span className="sr-only" id="save-disabled-desc">
                {!isDirty
                  ? "No disponible: no se han realizado cambios en el perfil."
                  : "No disponible: corrige los errores de validación en el formulario antes de guardar."}
              </span>
            )}
            {isSavingProfile && (
              <div className="sr-only" aria-live="assertive">
                Guardando cambios del perfil, por favor espera.
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Main Profile Edit Form Card */}
      <Card className="p-6 bg-auth-surface border-auth-input-border rounded-2xl shadow-md">
        <form id="profile-form" onSubmit={handleSave} className="space-y-6" noValidate>
          {/* Header Action section */}
          <div className="border-b border-auth-input-border/60 pb-4 mb-2">
            <h2 className="text-lg font-bold text-auth-title">
              Información Personal
            </h2>
            <p className="text-xs text-auth-label">
              Actualiza los detalles de tu cuenta y configuración de perfil.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            {/* Nombre */}
            <div className="space-y-1.5">
              <label htmlFor="firstName" className="block text-xs font-semibold text-auth-label">
                Nombre
              </label>
              <div className="relative">
                <Input
                  id="firstName"
                  name="firstName"
                  value={fields.firstName.value}
                  onChange={handleChange}
                  onBlur={() => handleBlur("firstName")}
                  disabled={!isEditingMode}
                  error={shouldShowFieldError("firstName", showErrors) ? firstNameError : undefined}
                  className="h-11 rounded-xl pr-10 bg-auth-input-bg/40 focus:bg-auth-input-bg/80 transition disabled:opacity-50"
                  placeholder="Tu nombre"
                  required
                  aria-required="true" // Added aria-required for accessibility
                />
                {!firstNameError && fields.firstName.value.trim() && isEditingMode && (
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 fill-emerald-500/10" aria-hidden="true" />
                  </span>
                )}
              </div>
            </div>

            {/* Apellidos */}
            <div className="space-y-1.5">
              <label htmlFor="lastName" className="block text-xs font-semibold text-auth-label">
                Apellidos
              </label>
              <div className="relative">
                <Input
                  id="lastName"
                  name="lastName"
                  value={fields.lastName.value}
                  onChange={handleChange}
                  onBlur={() => handleBlur("lastName")}
                  disabled={!isEditingMode}
                  error={shouldShowFieldError("lastName", showErrors) ? lastNameError : undefined}
                  className="h-11 rounded-xl pr-10 bg-auth-input-bg/40 focus:bg-auth-input-bg/80 transition disabled:opacity-50"
                  placeholder="Tus apellidos"
                  required
                  aria-required="true" // Added aria-required for accessibility
                />
                {!lastNameError && fields.lastName.value.trim() && isEditingMode && (
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 fill-emerald-500/10" aria-hidden="true" />
                  </span>
                )}
              </div>
            </div>

            {/* Username */}
            <div className="space-y-1.5">
              <label htmlFor="username" className="block text-xs font-semibold text-auth-label">
                Username
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-auth-label font-semibold font-mono" aria-hidden="true">
                  @
                </span>
                <Input
                  id="username"
                  name="username"
                  value={fields.username.value}
                  onChange={(e) => setFieldValue("username", e.target.value.toLowerCase())}
                  onBlur={() => handleBlur("username")}
                  disabled={!isEditingMode}
                  error={shouldShowFieldError("username", showErrors) ? usernameError : undefined}
                  className="h-11 pl-9 pr-10 rounded-xl bg-auth-input-bg/40 focus:bg-auth-input-bg/80 transition disabled:opacity-50"
                  placeholder="nombre_usuario"
                  required
                  aria-required="true" // Added aria-required for accessibility
                />
                {isUsernameValid && fields.username.value.trim() && isEditingMode && (
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 fill-emerald-500/10" aria-hidden="true" />
                  </span>
                )}
              </div>
              {/* Real-time username states */}
              {usernameFormatValid && usernameHasChanged && isEditingMode && (
                <div className="mt-1 px-1 text-xs" aria-live="polite">
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
              <p className="text-xs text-auth-label">
                Este nombre será visible para otros estudiantes en las salas de estudio.
              </p>
            </div>

            {/* Correo Electrónico */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-xs font-semibold text-auth-label">
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
                  disabled={!isEditingMode || authProvider === "google"}
                  className="h-11 rounded-xl pr-10 bg-auth-input-bg/40 focus:bg-auth-input-bg/80 transition disabled:opacity-40"
                  placeholder="correo@ejemplo.com"
                  required
                  aria-required="true" // Added aria-required for accessibility
                />
                {!emailError && fields.email.value.trim() && isEditingMode && (
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 fill-emerald-500/10" aria-hidden="true" />
                  </span>
                )}
              </div>
              {authProvider === "google" && (
                <p className="mt-1 flex items-start gap-1 text-xs leading-tight text-auth-label">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0 text-amber-500" aria-hidden="true" />
                  Autenticado con Google. No se puede modificar el correo.
                </p>
              )}
            </div>
          </div>
        </form>
      </Card>

      {/* Change Password Card - Only shown if provider is email/password */}
      {authProvider === "password" && (
        <Card className="p-6 bg-auth-surface border-auth-input-border rounded-2xl shadow-md">
          <form onSubmit={handlePasswordUpdate} className="space-y-6" noValidate>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-auth-input-border/60 pb-4 mb-2">
              <div>
                <h2 className="text-lg font-bold text-auth-title">
                  Cambiar Contraseña
                </h2>
                <p className="text-xs text-auth-label">
                  Actualiza tu contraseña de acceso de manera segura.
                </p>
              </div>
              <div>
                <button
                  type="submit"
                  disabled={!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmNewPassword || passwordLoading}
                  className="w-full sm:w-auto h-10 px-6 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 bg-auth-btn text-auth-btn-text font-semibold text-xs focus-visible:ring-2 focus-visible:ring-auth-btn focus-visible:ring-offset-2 focus-visible:outline-none"
                >
                  {passwordLoading ? "Actualizando..." : "Actualizar Contraseña"}
                </button>
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-3">
              {/* Contraseña Actual */}
              <div className="space-y-1.5">
                <label htmlFor="currentPassword" className="block text-xs font-semibold text-auth-label">
                  Contraseña Actual
                </label>
                <Input
                  id="currentPassword"
                  name="currentPassword"
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={handlePasswordFormChange}
                  error={passwordErrors.currentPassword || undefined}
                  className="h-11 rounded-xl bg-auth-input-bg/40 focus:bg-auth-input-bg/80 transition"
                  placeholder="••••••••"
                  required
                  aria-required="true" // Added aria-required for accessibility
                />
              </div>

              {/* Nueva Contraseña */}
              <div className="space-y-1.5">
                <label htmlFor="newPassword" className="block text-xs font-semibold text-auth-label">
                  Nueva Contraseña
                </label>
                <Input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={handlePasswordFormChange}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  error={passwordErrors.newPassword || undefined}
                  className="h-11 rounded-xl bg-auth-input-bg/40 focus:bg-auth-input-bg/80 transition"
                  placeholder="••••••••"
                  required
                  aria-required="true" // Added aria-required for accessibility
                />
                
                {/* Real-time Password Rules */}
                <div
                  className={`
                    overflow-hidden
                    transition-all
                    duration-300
                    mt-1.5
                    ${
                      (!!passwordForm.newPassword && (passwordFocused || !passwordValidation.isValid))
                        ? "max-h-40 opacity-100"
                        : "max-h-0 opacity-0"
                    }
                  `}
                >
                  <div className="space-y-1 px-1">
                    <div className={`flex items-center gap-2 text-xs transition-colors ${passwordValidation.minLength ? "text-auth-link" : "text-auth-error"}`}>
                      <CheckCircle2 className={`h-3.5 w-3.5 ${passwordValidation.minLength ? "text-emerald-500 fill-emerald-500/10" : "text-auth-error"}`} aria-hidden="true" />
                      <span>Mínimo 8 caracteres</span>
                    </div>
                    <div className={`flex items-center gap-2 text-xs transition-colors ${passwordValidation.hasUppercase ? "text-auth-link" : "text-auth-error"}`}>
                      <CheckCircle2 className={`h-3.5 w-3.5 ${passwordValidation.hasUppercase ? "text-emerald-500 fill-emerald-500/10" : "text-auth-error"}`} aria-hidden="true" />
                      <span>Incluye una mayúscula</span>
                    </div>
                    <div className={`flex items-center gap-2 text-xs transition-colors ${passwordValidation.hasNumber ? "text-auth-link" : "text-auth-error"}`}>
                      <CheckCircle2 className={`h-3.5 w-3.5 ${passwordValidation.hasNumber ? "text-emerald-500 fill-emerald-500/10" : "text-auth-error"}`} aria-hidden="true" />
                      <span>Incluye un número</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Confirmar Nueva Contraseña */}
              <div className="space-y-1.5">
                <label htmlFor="confirmNewPassword" className="block text-xs font-semibold text-auth-label">
                  Confirmar Nueva Contraseña
                </label>
                <Input
                  id="confirmNewPassword"
                  name="confirmNewPassword"
                  type="password"
                  value={passwordForm.confirmNewPassword}
                  onChange={handlePasswordFormChange}
                  error={passwordErrors.confirmNewPassword || undefined}
                  className="h-11 rounded-xl bg-auth-input-bg/40 focus:bg-auth-input-bg/80 transition"
                  placeholder="••••••••"
                  required
                  aria-required="true" // Added aria-required for accessibility
                />
                
                {/* Password Match Confirmation */}
                {!!passwordForm.confirmNewPassword && (
                  <div
                    className={`
                      overflow-hidden
                      transition-all
                      duration-200
                      mt-1.5
                      ${passwordFormMatches && passwordForm.newPassword === passwordForm.confirmNewPassword ? "max-h-10 opacity-100" : "max-h-0 opacity-0"}
                    `}
                  >
                    <div className="flex items-center gap-2 px-1 text-xs text-auth-link">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 fill-emerald-500/10" aria-hidden="true" />
                      <span>Las contraseñas coinciden</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </form>
        </Card>
      )}

      {/* Discreet account deletion section at bottom */}
      <div className="pt-8 border-t border-auth-input-border/40 flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setDeleteConfirmText("");
            setIsDeleteConfirmOpen(true);
          }}
          disabled={isDeleting}
          className="text-xs font-bold text-auth-error hover:text-red-500 hover:underline transition cursor-pointer bg-transparent border-0 focus-visible:ring-2 focus-visible:ring-auth-error focus-visible:ring-offset-2 focus-visible:outline-none rounded px-1.5 py-0.5"
        >
          Eliminar cuenta permanentemente
        </button>
        <p className="text-xs text-auth-label">
          Se borrarán todos tus datos de forma definitiva e irreversible.
        </p>
      </div>

      {/* Floating Changes Detected Banner */}
      {isEditingMode && isDirty && !toastDismissed && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 flex items-center justify-between gap-4 rounded-xl border border-auth-input-border bg-auth-surface p-4 shadow-2xl animate-scale-up min-w-[320px]"
        >
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-500 fill-emerald-500/10" aria-hidden="true" />
            <div>
              <p className="text-xs font-bold text-auth-title">Cambios detectados</p>
              <p className="text-xs text-auth-label">No olvides guardar tu progreso.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setToastDismissed(true)}
            aria-label="Cerrar aviso"
            className="rounded-lg p-1 text-auth-label hover:bg-auth-input-bg hover:text-auth-title transition cursor-pointer focus-visible:ring-2 focus-visible:ring-auth-btn focus-visible:outline-none"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Confirmation modal for saving changes */}
      <ConfirmModal
        isOpen={isSaveConfirmOpen}
        onClose={() => !isSavingProfile && setIsSaveConfirmOpen(false)}
        onConfirm={() => void handleSaveConfirm()}
        title="Confirmar Cambios"
        warning
        confirmText="Guardar"
        cancelText="Cancelar"
        isLoading={isSavingProfile}
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
        confirmAriaLabel="Confirmar eliminación permanente de la cuenta"
        confirmDisabled={deleteConfirmText !== `eliminar ${initialUsername}`}
        message={
          <div className="space-y-4">
            <p className="text-sm font-semibold text-auth-error">
              Por favor lee con atención las consecuencias de esta acción:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs text-auth-label">
              <li>Pérdida permanente de todos tus datos, perfiles y configuraciones.</li>
              <li>Cierre inmediato del acceso a la plataforma.</li>
              <li>Imposibilidad absoluta de recuperar tu cuenta en el futuro.</li>
            </ul>
            <div className="space-y-2 pt-3 border-t border-auth-input-border/40">
              <label htmlFor="delete-confirm-input" className="text-xs text-auth-label font-semibold block">
                Para confirmar, por favor escribe <span className="text-auth-error font-mono bg-auth-error/5 px-1.5 py-0.5 rounded border border-auth-error/20 select-all">eliminar {initialUsername}</span> a continuación:
              </label>
              <Input
                id="delete-confirm-input"
                type="text"
                placeholder={`eliminar ${initialUsername}`}
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                aria-describedby="delete-confirm-hint"
                className="h-10 rounded-xl text-center bg-auth-input-bg/30 border-auth-input-border focus-visible:ring-auth-error focus-visible:border-auth-error placeholder:text-auth-label"
              />
              <p id="delete-confirm-hint" className="sr-only">
                Escribe exactamente eliminar {initialUsername} para habilitar la eliminación de la cuenta.
              </p>
            </div>
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
          if (successTitle === "Cuenta eliminada") {
            window.location.href = "/login";
          }
        }}
        title={successTitle}
        message={successMessage}
      />

      {/* Error dialog */}
      <ErrorModal
        isOpen={isErrorOpen}
        onClose={() => setIsErrorOpen(false)}
        title={errorTitle}
        message={errorMsg || ""}
      />
    </section>
  );
}
