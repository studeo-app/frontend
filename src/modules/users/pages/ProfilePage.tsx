import { useMemo, useState } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import { useForm } from "@/shared/hooks/useForm";
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth";
import { Input } from "@/shared/components/ui/Input";
import { Button } from "@/shared/components/ui/Button";
import { Card } from "@/shared/components/ui/Card";
import { SuccessModal } from "@/shared/components/ui/SuccessModal";
import { ErrorModal } from "@/shared/components/ui/ErrorModal";
import { ConfirmModal } from "@/shared/components/ui/ConfirmModal";
import { ReauthModal } from "@/shared/components/ui/ReauthModal";
import { ProfileAvatarCarousel } from "@/modules/auth/components/ProfileAvatarCarousel";
import { useUsernameAvailability } from "@/modules/auth/hooks/useUsernameAvailability";
import { usePasswordValidation } from "@/shared/hooks/usePasswordValidation";
import { checkEmailAvailability } from "@/modules/users/api/usersApi";
import { auth } from "@/config/firebase.config";
import useDocumentTitle from "@/shared/hooks/useDocumentTitle";
import { AlertCircle, CheckCircle2, Save, X } from "lucide-react";

export default function ProfilePage() {
  useDocumentTitle("Perfil - Studeo");
  const { profile, user: firebaseUser, updateProfileData, deleteAccountAction, loading } = useAuthStore();

  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isErrorOpen, setIsErrorOpen] = useState(false);
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
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!passwordForm.currentPassword.trim() || !passwordForm.newPassword.trim() || !passwordForm.confirmNewPassword.trim()) {
      setErrorMsg("Todos los campos de contraseña son obligatorios.");
      setIsErrorOpen(true);
      return;
    }

    if (!passwordValidation.isValid) {
      setErrorMsg("La nueva contraseña no cumple con los requisitos mínimos.");
      setIsErrorOpen(true);
      return;
    }

    if (!passwordFormMatches) {
      setErrorMsg("La nueva contraseña y la confirmación no coinciden.");
      setIsErrorOpen(true);
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

      setSuccessMessage("Tu contraseña ha sido actualizada con éxito.");
      setIsSuccessOpen(true);
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmNewPassword: "",
      });
    } catch (err: any) {
      let friendlyMsg = err.message || "Error al actualizar la contraseña.";
      if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password") {
        friendlyMsg = "La contraseña actual ingresada es incorrecta.";
      } else if (err.code === "auth/weak-password") {
        friendlyMsg = "La nueva contraseña es muy débil. Intenta usar más caracteres y símbolos.";
      }
      setErrorMsg(friendlyMsg);
      setIsErrorOpen(true);
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
      setIsEditingMode(false);
    } catch (err: any) {
      if (err.code === "auth/requires-recent-login" || err.message?.includes("recent-login")) {
        setPendingAction("update");
        setIsReauthOpen(true);
      } else {
        let friendlyMsg = err.message || "Error al actualizar el perfil.";
        const isEmailError = 
          err.code === "auth/email-already-in-use" || 
          friendlyMsg.includes("email-already-in-use") || 
          friendlyMsg.toLowerCase().includes("email is already in use") ||
          friendlyMsg.toLowerCase().includes("email_already_in_use") ||
          (friendlyMsg.toLowerCase().includes("correo") && friendlyMsg.toLowerCase().includes("registrado"));

        const isUsernameError = 
          friendlyMsg.includes("Username is already taken") || 
          (friendlyMsg.toLowerCase().includes("username") && friendlyMsg.toLowerCase().includes("taken")) ||
          friendlyMsg.toLowerCase().includes("username_taken") ||
          (friendlyMsg.toLowerCase().includes("nombre de usuario") && friendlyMsg.toLowerCase().includes("registrado"));

        if (isEmailError) {
          friendlyMsg = "El correo electrónico institucional ingresado ya está registrado por otro usuario.";
        } else if (isUsernameError) {
          friendlyMsg = "El nombre de usuario ya está registrado por otra persona. Por favor elige otro.";
        }
        setErrorMsg(friendlyMsg);
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

    if (usernameHasChanged && usernameAvailable === false) {
      setErrorMsg("El nombre de usuario ya está registrado por otra persona. Por favor elige otro.");
      setIsErrorOpen(true);
      return;
    }

    const emailChanged = fields.email.value.trim().toLowerCase() !== initialEmail.toLowerCase();
    if (emailChanged) {
      try {
        const check = await checkEmailAvailability(fields.email.value);
        if (check.available === false) {
          setErrorMsg("El correo electrónico institucional ingresado ya está registrado por otro usuario.");
          setIsErrorOpen(true);
          return;
        }
      } catch (err) {
        console.warn("No se pudo comprobar la disponibilidad del correo:", err);
      }
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

  if (loading) {
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

  return (
    <section className="space-y-6 max-w-4xl mx-auto">
      {/* Profile Header Banner Card */}
      <Card className="relative overflow-hidden bg-auth-surface border-auth-input-border rounded-2xl p-6 shadow-md">
        {/* Banner background graphic */}
        <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-r from-auth-btn/20 to-auth-btn/5" />

        <div className="relative pt-8 flex flex-col md:flex-row items-center md:items-end gap-6">
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
          <div className="flex-1 text-center md:text-left">
            <h2 className="text-2xl font-extrabold text-auth-title tracking-tight">
              {profile ? `${profile.firstName} ${profile.lastName}` : "Usuario Pro"}
            </h2>
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
      </Card>

      {/* Main Profile Edit Form Card */}
      <Card className="p-6 bg-auth-surface border-auth-input-border rounded-2xl shadow-md">
        <form onSubmit={handleSave} className="space-y-6" noValidate>
          {/* Header Action section */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-auth-input-border/60 pb-4 mb-2">
            <div>
              <h3 className="text-lg font-bold text-auth-title">
                Información Personal
              </h3>
              <p className="text-xs text-auth-label">
                Actualiza los detalles de tu cuenta y configuración de perfil.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {!isEditingMode ? (
                <Button
                  type="button"
                  onClick={() => setIsEditingMode(true)}
                  className="w-full sm:w-auto h-10 px-6 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md hover:scale-[1.02] active:scale-[0.98] bg-auth-btn text-auth-btn-text"
                >
                  Editar Perfil
                </Button>
              ) : (
                <>
                  <Button
                    type="button"
                    onClick={handleCancelEdit}
                    className="w-full sm:w-auto h-10 px-6 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all border border-auth-input-border hover:bg-auth-input-bg text-auth-label"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={!isDirty || hasValidationErrors}
                    className="w-full sm:w-auto h-10 px-6 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 bg-auth-btn text-auth-btn-text"
                  >
                    <Save className="h-4 w-4" />
                    Guardar Cambios
                  </Button>
                </>
              )}
            </div>
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
                />
                {!firstNameError && fields.firstName.value.trim() && isEditingMode && (
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 fill-emerald-500/10" />
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
                />
                {!lastNameError && fields.lastName.value.trim() && isEditingMode && (
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 fill-emerald-500/10" />
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
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-auth-label/60 font-semibold font-mono" aria-hidden="true">
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
                />
                {isUsernameValid && fields.username.value.trim() && isEditingMode && (
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 fill-emerald-500/10" />
                  </span>
                )}
              </div>
              {/* Real-time username states */}
              {usernameFormatValid && usernameHasChanged && isEditingMode && (
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
              <p className="text-[11px] text-auth-label/70">
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
                />
                {!emailError && fields.email.value.trim() && isEditingMode && (
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 fill-emerald-500/10" />
                  </span>
                )}
              </div>
              {authProvider === "google" && (
                <p className="mt-1 flex items-start gap-1 text-[11px] leading-tight text-auth-label/70">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0 text-amber-500" />
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
                <h3 className="text-lg font-bold text-auth-title">
                  Cambiar Contraseña
                </h3>
                <p className="text-xs text-auth-label">
                  Actualiza tu contraseña de acceso de manera segura.
                </p>
              </div>
              <div>
                <Button
                  type="submit"
                  disabled={!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmNewPassword || passwordLoading}
                  className="w-full sm:w-auto h-10 px-6 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 bg-auth-btn text-auth-btn-text font-semibold text-xs"
                >
                  {passwordLoading ? "Actualizando..." : "Actualizar Contraseña"}
                </Button>
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
                  className="h-11 rounded-xl bg-auth-input-bg/40 focus:bg-auth-input-bg/80 transition"
                  placeholder="••••••••"
                  required
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
                  className="h-11 rounded-xl bg-auth-input-bg/40 focus:bg-auth-input-bg/80 transition"
                  placeholder="••••••••"
                  required
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
                      <CheckCircle2 className={`h-3.5 w-3.5 ${passwordValidation.minLength ? "text-emerald-500 fill-emerald-500/10" : "text-auth-error"}`} />
                      <span>Mínimo 8 caracteres</span>
                    </div>
                    <div className={`flex items-center gap-2 text-xs transition-colors ${passwordValidation.hasUppercase ? "text-auth-link" : "text-auth-error"}`}>
                      <CheckCircle2 className={`h-3.5 w-3.5 ${passwordValidation.hasUppercase ? "text-emerald-500 fill-emerald-500/10" : "text-auth-error"}`} />
                      <span>Incluye una mayúscula</span>
                    </div>
                    <div className={`flex items-center gap-2 text-xs transition-colors ${passwordValidation.hasNumber ? "text-auth-link" : "text-auth-error"}`}>
                      <CheckCircle2 className={`h-3.5 w-3.5 ${passwordValidation.hasNumber ? "text-emerald-500 fill-emerald-500/10" : "text-auth-error"}`} />
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
                  className="h-11 rounded-xl bg-auth-input-bg/40 focus:bg-auth-input-bg/80 transition"
                  placeholder="••••••••"
                  required
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
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 fill-emerald-500/10" />
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
          className="text-xs font-bold text-auth-error hover:text-red-500 hover:underline transition cursor-pointer bg-transparent border-0"
        >
          Eliminar cuenta permanentemente
        </button>
        <p className="text-[10px] text-auth-label/70">
          Se borrarán todos tus datos de forma definitiva e irreversible.
        </p>
      </div>

      {/* Floating Changes Detected Banner */}
      {isEditingMode && isDirty && !toastDismissed && (
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
              <p className="text-xs text-auth-label font-semibold">
                Para confirmar, por favor escribe <span className="text-auth-error font-mono bg-auth-error/5 px-1.5 py-0.5 rounded border border-auth-error/20 select-all">eliminar {initialUsername}</span> a continuación:
              </p>
              <Input
                type="text"
                placeholder={`eliminar ${initialUsername}`}
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="h-10 rounded-xl text-center bg-auth-input-bg/30 border-auth-input-border focus-visible:ring-auth-error focus-visible:border-auth-error placeholder:text-auth-label/20 placeholder:opacity-25"
              />
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
