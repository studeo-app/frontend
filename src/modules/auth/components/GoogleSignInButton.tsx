import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '@/shared/components/ui/Button';
import { useAuthStore } from '@/stores/useAuthStore';
import GoogleIcon from './GoogleIcon';

// Definir el tipo de error de Firebase
interface FirebaseError {
  code: string;
  message: string;
}

// Type guard para verificar si es un error de Firebase
function isFirebaseError(error: unknown): error is FirebaseError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as FirebaseError).code === 'string'
  );
}

interface GoogleSignInButtonProps {
  onSuccess?: () => void | Promise<void>;
  onClick?: () => void | Promise<void>;
  onError?: (error: string) => void;
}

export default function GoogleSignInButton({ 
  onSuccess, 
  onClick,
  onError 
}: GoogleSignInButtonProps) {
  const navigate = useNavigate();
  const loginWithGoogle = useAuthStore((state) => state.loginWithGoogle);
  const error = useAuthStore((state) => state.error);
  const clearError = useAuthStore((state) => state.clearError);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleGoogleSignIn = async () => {
    clearError();
    setIsSubmitting(true);

    try {
      await loginWithGoogle();
      await onSuccess?.();
      await onClick?.();
      navigate('/dashboard');
    } catch (err: unknown) {  // ✅ Usar unknown en lugar de any
      // Verificar si es error de Firebase con el type guard
      if (isFirebaseError(err) && err.code === 'auth/popup-closed-by-user') {
        return;
      }
      
      // Manejar diferentes tipos de error
      let errorMessage = 'Error al iniciar sesión con Google';
      
      if (isFirebaseError(err)) {
        // Mapear códigos de error de Firebase
        switch (err.code) {
          case 'auth/popup-blocked':
            errorMessage = 'El navegador bloqueó la ventana emergente. Permite ventanas emergentes para este sitio.';
            break;
          case 'auth/network-request-failed':
            errorMessage = 'Error de red. Revisa tu conexión.';
            break;
          case 'auth/account-exists-with-different-credential':
            errorMessage = 'Ya existe una cuenta con este correo usando otro proveedor.';
            break;
          default:
            errorMessage = err.message || 'Error al iniciar sesión con Google';
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      onError?.(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-3">
      <Button
        type="button"
        variant="outline"
        onClick={handleGoogleSignIn}
        disabled={isSubmitting}
        isLoading={isSubmitting}
        className="h-12 w-full rounded-xl border-border/60 bg-muted/20 text-foreground hover:bg-muted/40"
      >
        <GoogleIcon className="mr-2 h-4 w-4 shrink-0" />
        Continuar con Google
      </Button>

      {error && error !== 'auth/popup-closed-by-user' && (
        <p className="text-center text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}