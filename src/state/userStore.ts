import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { User } from "../types/user";

interface UserState {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  updateCurrentUser: (updates: Partial<User>) => void;
  clearCurrentUser: () => void;
  isAuthenticated: () => boolean;
  isModerator: () => boolean;
  isAdministrator: () => boolean;
  hasUsedFreeTrip: boolean;
  setHasUsedFreeTrip: (used: boolean) => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      hasUsedFreeTrip: false,

      setCurrentUser: (user) => set({ currentUser: user }),

      updateCurrentUser: (updates) =>
        set((state) => ({
          currentUser: state.currentUser
            ? { ...state.currentUser, ...updates }
            : null,
        })),

      clearCurrentUser: () => set({ currentUser: null }),

      isAuthenticated: () => get().currentUser !== null,

      isModerator: () => {
        const user = get().currentUser;
        return user?.role === "moderator" || user?.role === "administrator" || user?.membershipTier === "isModerator";
      },

      isAdministrator: () => {
        const user = get().currentUser;
        return user?.role === "administrator" || user?.membershipTier === "isAdmin";
      },

      setHasUsedFreeTrip: (used) => set({ hasUsedFreeTrip: used }),
    }),
    {
      name: "user-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

// Selector hooks
export const useCurrentUser = () => useUserStore((s) => s.currentUser);
export const useIsAuthenticated = () => useUserStore((s) => s.isAuthenticated());
export const useIsModerator = () => useUserStore((s) => s.isModerator());
export const useIsAdministrator = () => useUserStore((s) => s.isAdministrator());

// Helper to create test user (for development)
export function createTestUser(role: User["role"] = "administrator"): User {
  return {
    id: "test_user_1",
    email: "alana@tentandlantern.com",
    handle: "tentandlantern",
    displayName: "Alana Waters Piper",
    photoURL: undefined,
    role,
    membershipTier: "isAdmin",
    membershipExpiresAt: undefined,
    isBanned: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

