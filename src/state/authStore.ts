import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface UserProfile {
  id: string;
  email: string;
  handle: string;
  displayName?: string;
  avatarUrl?: string;
  createdAt: string;
  isPremium?: boolean;
  isTrial?: boolean;
}

interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  setUser: (user: UserProfile | null) => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
  signOut: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,

      setUser: (user) =>
        set({
          user,
          isAuthenticated: !!user,
        }),

      updateProfile: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),

      signOut: () =>
        set({
          user: null,
          isAuthenticated: false,
        }),

      setLoading: (loading) => set({ isLoading: loading }),
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
