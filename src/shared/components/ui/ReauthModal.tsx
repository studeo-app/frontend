import React, { useState } from "react";
import { EmailAuthProvider, reauthenticateWithCredential, reauthenticateWithPopup } from "firebase/auth";
import { auth, googleProvider } from "@/config/firebase.config";
import { BaseModal } from "./BaseModal";
import { Button } from "./Button";
import { Input } from "./Input";
import type { AuthProvider } from "@/types/user";

interface ReauthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  authProvider: AuthProvider;
}

export const ReauthModal: React.FC<ReauthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  authProvider,
}) => {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handlePasswordReauth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const currentUser = auth.currentUser;
      if (!currentUser || !currentUser.email) {
        throw new Error("No se pudo identificar la sesión actual.");
      }

      const credential = EmailAuthProvider.credential(currentUser.email, password);
      await reauthenticateWithCredential(currentUser, credential);
      
      setPassword("");
      onSuccess();
    } catch (err: any) {
      if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password") {
        setError("Contraseña incorrecta. Por favor, inténtalo de nuevo.");
      } else {
        setError(err.message || "Error al verificar identidad.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleReauth = async () => {
    setLoading(true);
    setError(null);

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error("No se pudo identificar la sesión actual.");
      }

      await reauthenticateWithPopup(currentUser, googleProvider);
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Error al verificar cuenta con Google.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Verifica tu identidad"
    >
      <div className="py-2">
        <p className="mb-4 text-sm text-auth-label">
          Por motivos de seguridad, debes confirmar tu identidad para realizar este cambio.
        </p>

        {authProvider === "password" ? (
          <form onSubmit={handlePasswordReauth} className="space-y-4">
            <div>
              <label
                htmlFor="reauth-password"
                className="mb-1 block text-xs font-semibold uppercase tracking-wider text-auth-label"
              >
                Contraseña actual
              </label>
              <Input
                id="reauth-password"
                type="password"
                placeholder="Ingresa tu contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
                className="h-11"
              />
            </div>

            {error && (
              <p role="alert" className="text-xs text-auth-error animate-fade-in">
                {error}
              </p>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
                className="w-full"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={loading}
                className="w-full"
              >
                Confirmar
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            {error && (
              <p role="alert" className="text-xs text-auth-error animate-fade-in">
                {error}
              </p>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
                className="w-full"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="primary"
                isLoading={loading}
                onClick={handleGoogleReauth}
                className="w-full"
              >
                Confirmar con Google
              </Button>
            </div>
          </div>
        )}
      </div>
    </BaseModal>
  );
};
