import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { CommunityTip, TipCategory } from "../types/community";
import { getTips, createTip, deleteTip, type Tip } from "../api/tips-service";

export const TIP_CATEGORIES: TipCategory[] = [
  { id: "setup", name: "Setup & Campsite", icon: "home" },
  { id: "cooking", name: "Cooking", icon: "restaurant" },
  { id: "safety", name: "Safety", icon: "shield-checkmark" },
  { id: "gear", name: "Gear", icon: "backpack" },
  { id: "weather", name: "Weather", icon: "cloud" },
  { id: "wildlife", name: "Wildlife", icon: "paw" },
  { id: "navigation", name: "Navigation", icon: "compass" },
  { id: "water", name: "Water", icon: "water" },
  { id: "family", name: "Family Camping", icon: "people" },
  { id: "other", name: "Other", icon: "ellipsis-horizontal" },
];

interface TipState {
  tips: Tip[];
  isLoading: boolean;
  favorites: string[];
  bookmarks: string[];

  // Actions
  syncFromFirebase: () => Promise<void>;
  addTip: (text: string, userId: string, images?: string[]) => Promise<string>;
  deleteTip: (tipId: string, userId: string) => Promise<void>;
  toggleFavorite: (tipId: string) => void;
  toggleBookmark: (tipId: string) => void;
  getTipById: (tipId: string) => Tip | undefined;
}

export const useTipStore = create<TipState>()(
  persist(
    (set, get) => ({
      tips: [],
      isLoading: false,
      favorites: [],
      bookmarks: [],

      syncFromFirebase: async () => {
        try {
          set({ isLoading: true });
          const tips = await getTips();
          set({ tips, isLoading: false });
        } catch (error) {
          console.error("Error syncing tips:", error);
          set({ isLoading: false });
        }
      },

      addTip: async (text, userId, images) => {
        try {
          const tipId = await createTip(text, userId, images);

          // Refresh from Firebase
          await get().syncFromFirebase();
          return tipId;
        } catch (error) {
          console.error("Error adding tip:", error);
          throw error;
        }
      },

      deleteTip: async (tipId, userId) => {
        try {
          await deleteTip(tipId, userId);
          set((state) => ({
            tips: state.tips.filter((tip) => tip.id !== tipId),
          }));
        } catch (error) {
          console.error("Error deleting tip:", error);
          throw error;
        }
      },

      toggleFavorite: (tipId) =>
        set((state) => ({
          favorites: state.favorites.includes(tipId)
            ? state.favorites.filter((id) => id !== tipId)
            : [...state.favorites, tipId],
        })),

      toggleBookmark: (tipId) =>
        set((state) => ({
          bookmarks: state.bookmarks.includes(tipId)
            ? state.bookmarks.filter((id) => id !== tipId)
            : [...state.bookmarks, tipId],
        })),

      getTipById: (tipId) => {
        return get().tips.find((tip) => tip.id === tipId);
      },
    }),
    {
      name: "tip-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        tips: state.tips,
        favorites: state.favorites,
        bookmarks: state.bookmarks,
      }),
    }
  )
);

// Selector hooks for optimized subscriptions
export const useTips = () => useTipStore((state) => state.tips);
export const useFavoriteTips = () => {
  const tips = useTipStore((state) => state.tips);
  const favorites = useTipStore((state) => state.favorites);
  return tips.filter((tip) => favorites.includes(tip.id));
};
export const useBookmarkedTips = () => {
  const tips = useTipStore((state) => state.tips);
  const bookmarks = useTipStore((state) => state.bookmarks);
  return tips.filter((tip) => bookmarks.includes(tip.id));
};
