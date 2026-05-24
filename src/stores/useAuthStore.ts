import { create } from 'zustand'
import type { User } from 'firebase/auth'
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth'
import { auth, googleProvider } from '@/config/firebase.config'

interface AuthState {
  user: User | null
  loading: boolean
  error: string | null
  loginWithGoogle: () => Promise<void>
  logout: () => Promise<void>
  clearError: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  error: null,

  loginWithGoogle: async () => {
    set({ error: null })
    try {
      await signInWithPopup(auth, googleProvider)
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'No se pudo iniciar sesión con Google'
      set({ error: message })
      throw err
    }
  },

  logout: async () => {
    set({ error: null })
    try {
      await signOut(auth)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'No se pudo cerrar sesión'
      set({ error: message })
    }
  },

  clearError: () => set({ error: null }),
}))

onAuthStateChanged(auth, (user) => {
  useAuthStore.setState({ user, loading: false })
})
