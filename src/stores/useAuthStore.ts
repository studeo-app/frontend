import { create } from "zustand";
import type { User } from "firebase/auth";
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  createUserWithEmailAndPassword,
  updateProfile,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { auth, googleProvider } from "@/config/firebase.config";
import { registerOrSyncUser } from "@/modules/auth/api/authApi";
import {
  completeUserProfile,
  fetchUserProfile,
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

  getIdToken: () => Promise<string>;
  syncWithBackend: (payload?: {
    firstName?: string;
    lastName?: string;
  }) => Promise<RegisterSyncResponse>;
  fetchProfile: () => Promise<ProfileStatusResponse>;
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
  logout: () => Promise<void>;
  clearError: () => void;
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

  loginWithGoogle: async () => {
    set({ error: null });
    try {
      await signInWithPopup(auth, googleProvider);
      return await get().syncWithBackend();
    } catch (err) {
      throw err;
    }
  },

  loginWithEmail: async (email, password) => {
    set({ error: null });
    try {
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
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "No se pudo cerrar sesión";
      set({ error: message });
    }
  },

  clearError: () => set({ error: null }),
}));

onAuthStateChanged(auth, async (user) => {
  useAuthStore.setState({ user, loading: true });

  if (!user) {
    useAuthStore.setState({
      loading: false,
      profile: null,
      profileComplete: null,
      authProvider: null,
      suggestedProfile: null,
    });
    return;
  }

  try {
    await useAuthStore.getState().fetchProfile();
  } catch {
    useAuthStore.setState({
      profile: null,
      profileComplete: null,
      authProvider: null,
      suggestedProfile: null,
    });
  } finally {
    useAuthStore.setState({ loading: false });
  }
});
