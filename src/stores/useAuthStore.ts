import { create } from "zustand";
import type { User } from "firebase/auth";
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  createUserWithEmailAndPassword,
  updateProfile,
  signInWithEmailAndPassword,
  fetchSignInMethodsForEmail,
  deleteUser,
  updateEmail,
} from "firebase/auth";
import { auth, googleProvider } from "@/config/firebase.config";
import { getApiErrorMessage } from "@/shared/api/apiError";
import { registerOrSyncUser } from "@/modules/auth/api/authApi";
import {
  completeUserProfile,
  fetchUserProfile,
  updateUserProfile,
  deleteUserAccount,
  backendCheck,
} from "@/modules/users/api/usersApi";
import type {
  AuthProvider,
  ProfileStatusResponse,
  RegisterSyncResponse,
  SuggestedProfile,
  UserProfile,
} from "@/types/user";

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  profileComplete: boolean | null;
  authProvider: AuthProvider | null;
  suggestedProfile: SuggestedProfile | null;
  loading: boolean;
  error: string | null;
  profileLoadError: string | null;
  /** Evita redirigir al dashboard antes de cerrar el modal de éxito */
  pendingProfileSuccessModal: boolean;

  getIdToken: () => Promise<string>;
  syncWithBackend: (payload?: {
    firstName?: string;
    lastName?: string;
  }) => Promise<RegisterSyncResponse>;
  fetchProfile: () => Promise<ProfileStatusResponse>;
  retryLoadProfile: () => Promise<void>;
  loginWithGoogle: () => Promise<RegisterSyncResponse>;
  loginWithEmail: (
    email: string,
    password: string
  ) => Promise<RegisterSyncResponse>;
  registerWithEmail: (
    email: string,
    password: string,
    firstName: string,
    lastName: string
  ) => Promise<RegisterSyncResponse>;
  completeProfile: (data: {
    username: string;
    avatarUrl?: string;
  }) => Promise<void>;
  acknowledgeProfileSuccess: () => void;
  logout: () => Promise<void>;
  clearError: () => void;
  updateProfileData: (payload: {
    firstName: string;
    lastName: string;
    username: string;
    email: string;
    avatarUrl?: string;
  }) => Promise<void>;
  deleteAccountAction: () => Promise<void>;
}

function applyProfileState(
  set: (partial: Partial<AuthState>) => void,
  data: {
    profileComplete: boolean;
    user?: UserProfile | null;
    authProvider?: AuthProvider | null;
    suggestedProfile?: SuggestedProfile | null;
  }
) {
  set({
    profileComplete: data.profileComplete,
    profile: data.user ?? null,
    authProvider: data.authProvider ?? null,
    suggestedProfile: data.suggestedProfile ?? null,
    profileLoadError: null,
  });
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  profileComplete: null,
  authProvider: null,
  suggestedProfile: null,
  loading: true,
  error: null,
  profileLoadError: null,
  pendingProfileSuccessModal: false,

  getIdToken: async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error("No hay sesión activa.");
    }
    return currentUser.getIdToken();
  },

  syncWithBackend: async (payload) => {
    const token = await get().getIdToken();
    const response = await registerOrSyncUser(token, payload);

    applyProfileState(set, {
      profileComplete: response.profileComplete,
      user: response.user,
      authProvider: response.user.authProvider,
      suggestedProfile: null,
    });

    return response;
  },

  fetchProfile: async () => {
    const token = await get().getIdToken();
    const response = await fetchUserProfile(token);

    applyProfileState(set, {
      profileComplete: response.profileComplete,
      user: response.user,
      authProvider: response.authProvider,
      suggestedProfile: response.suggestedProfile,
    });

    return response;
  },

  retryLoadProfile: async () => {
    set({ loading: true, profileLoadError: null });
    try {
      await get().fetchProfile();
    } catch (err) {
      set({
        profile: null,
        profileComplete: null,
        authProvider: null,
        suggestedProfile: null,
        profileLoadError: getApiErrorMessage(
          err,
          "No pudimos cargar tu perfil desde el servidor."
        ),
      });
    } finally {
      set({ loading: false });
    }
  },

  loginWithGoogle: async () => {
    set({ error: null });
    try {
      const credential = await signInWithPopup(auth, googleProvider);
      const firebaseUser = credential.user ?? auth.currentUser;

      const email = firebaseUser?.email?.toLowerCase() ?? "";
      // Acepta cualquier correo institucional con dominio .edu (ej: usc.edu.co, correounivalle.edu.co, uao.edu.co)
      const allowed = /\.edu(\.[a-z]{2,})?$/.test(email.split("@")[1] ?? "");

      if (!allowed) {
        const message = "Solo se puede ingresar con cuenta institucional";
        try {
          if (firebaseUser) {
            await deleteUser(firebaseUser);
          }
        } catch (deleteErr) {
          console.warn("No se pudo eliminar usuario no institucional:", deleteErr);
        }
        const error = new Error(message);
        set({ error: message });
        throw error;
      }

      return await get().syncWithBackend();
    } catch (err) {
      throw err;
    }
  },

  loginWithEmail: async (email, password) => {
    set({ error: null });
    try {
      const methods = await fetchSignInMethodsForEmail(auth, email);

      if (methods.includes("google.com")) {
        const message = "Esta cuenta fue creada con Google";
        set({ error: message });
        throw new Error(message);
      }

      await signInWithEmailAndPassword(auth, email, password);
      return await get().syncWithBackend();
    } catch (err) {
      throw err;
    }
  },

  registerWithEmail: async (email, password, firstName, lastName) => {
    set({ error: null });
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const firebaseUser = userCredential.user;
      const displayName = `${firstName} ${lastName}`.trim();
      await updateProfile(firebaseUser, { displayName });
      set({ user: { ...firebaseUser, displayName } as unknown as User });

      return await get().syncWithBackend({ firstName, lastName });
    } catch (err) {
      throw err;
    }
  },

  completeProfile: async ({ username, avatarUrl }) => {
    const token = await get().getIdToken();
    const response = await completeUserProfile(token, { username, avatarUrl });

    applyProfileState(set, {
      profileComplete: response.profileComplete,
      user: response.user,
      authProvider: response.user.authProvider,
      suggestedProfile: null,
    });

    set({ pendingProfileSuccessModal: true });
  },

  acknowledgeProfileSuccess: () => {
    set({ pendingProfileSuccessModal: false });
  },

  logout: async () => {
    set({ error: null });
    try {
      await signOut(auth);
      set({
        profile: null,
        profileComplete: null,
        authProvider: null,
        suggestedProfile: null,
        pendingProfileSuccessModal: false,
        profileLoadError: null,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "No se pudo cerrar sesión";
      set({ error: message });
    }
  },

  clearError: () => set({ error: null }),

  updateProfileData: async (payload) => {
    set({ error: null });
    try {
      try {
        await backendCheck();
      } catch {
        throw new Error("El servidor de la aplicación no está disponible. Por favor, inténtalo más tarde.");
      }

      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error("No hay sesión activa.");
      }

      const currentProfile = get().profile;
      const currentEmail = currentProfile?.email ?? currentUser.email ?? "";
      const emailChanged = payload.email.trim().toLowerCase() !== currentEmail.trim().toLowerCase();

      if (emailChanged) {
        const provider = get().authProvider;
        if (provider === "google") {
          throw new Error("Los usuarios autenticados mediante Google no pueden modificar su correo electrónico desde la aplicación.");
        }

        await updateEmail(currentUser, payload.email.trim().toLowerCase());
      }

      const token = await get().getIdToken();
      await updateUserProfile(token, {
        firstName: payload.firstName,
        lastName: payload.lastName,
        username: payload.username.trim().toLowerCase(),
        avatarUrl: payload.avatarUrl,
        email: payload.email.trim().toLowerCase(),
      });

      await get().fetchProfile();

      try {
        if (auth.currentUser) {
          await auth.currentUser.reload();
          set({ user: auth.currentUser });
        }
      } catch (err) {
        console.warn("No se pudo recargar el usuario de Firebase Auth:", err);
      }
    } catch (err: unknown) {
      throw err;
    }
  },

  deleteAccountAction: async () => {
    set({ error: null });
    try {
      const token = await get().getIdToken();
      await deleteUserAccount(token);

      await signOut(auth);
      set({
        user: null,
        profile: null,
        profileComplete: null,
        authProvider: null,
        suggestedProfile: null,
        loading: false,
        pendingProfileSuccessModal: false,
      });
    } catch (err: unknown) {
      throw err;
    }
  },
}));

onAuthStateChanged(auth, async (user) => {
  if (user) {
    const email = user.email?.toLowerCase() ?? "";
    const allowed = /\.edu(\.[a-z]{2,})?$/.test(email.split("@")[1] ?? "");
    if (!allowed) {
      try {
        await signOut(auth);
      } catch (err) {
        console.warn("Error al cerrar sesión de usuario no permitido:", err);
      }
      useAuthStore.setState({
        user: null,
        loading: false,
        profile: null,
        profileComplete: null,
        authProvider: null,
        suggestedProfile: null,
        pendingProfileSuccessModal: false,
        profileLoadError: null,
      });
      return;
    }
  }

  if (!user) {
    useAuthStore.setState({
      user: null,
      loading: false,
      profile: null,
      profileComplete: null,
      authProvider: null,
      suggestedProfile: null,
      pendingProfileSuccessModal: false,
      profileLoadError: null,
    });
    return;
  }

  const previousUid = useAuthStore.getState().user?.uid;
  const isSameUser = previousUid === user.uid;

  if (isSameUser) {
    useAuthStore.setState({ user });
    return;
  }

  useAuthStore.setState({ user, loading: true, profileLoadError: null });

  try {
    await useAuthStore.getState().fetchProfile();
  } catch (err) {
    useAuthStore.setState({
      profile: null,
      profileComplete: null,
      authProvider: null,
      suggestedProfile: null,
      profileLoadError: getApiErrorMessage(
        err,
        "No pudimos cargar tu perfil desde el servidor."
      ),
    });
  } finally {
    useAuthStore.setState({ loading: false });
  }
});
