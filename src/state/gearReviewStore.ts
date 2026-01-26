import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getGearReviews,
  createGearReview,
  deleteGearReview,
  type GearReview,
} from "../api/gear-reviews-service";

interface GearReviewState {
  reviews: GearReview[];
  isLoading: boolean;

  // Actions
  syncFromFirebase: () => Promise<void>;
  addReview: (
    title: string,
    brand: string,
    category: string,
    rating: number,
    text: string,
    userId: string,
    imageUrl?: string
  ) => Promise<string>;
  deleteReview: (reviewId: string, userId: string) => Promise<void>;
  getReviewById: (reviewId: string) => GearReview | undefined;
}

export const useGearReviewStore = create<GearReviewState>()(
  persist(
    (set, get) => ({
      reviews: [],
      isLoading: false,

      syncFromFirebase: async () => {
        try {
          set({ isLoading: true });
          const reviews = await getGearReviews();
          set({ reviews, isLoading: false });
        } catch (error) {
          console.error("Error syncing gear reviews:", error);
          set({ isLoading: false });
        }
      },

      addReview: async (title, brand, category, rating, text, userId, imageUrl) => {
        try {
          const reviewId = await createGearReview(title, brand, category, rating, text, userId, imageUrl);
          await get().syncFromFirebase();
          return reviewId;
        } catch (error) {
          console.error("Error adding review:", error);
          throw error;
        }
      },

      deleteReview: async (reviewId, userId) => {
        try {
          await deleteGearReview(reviewId, userId);
          set((state) => ({
            reviews: state.reviews.filter((review) => review.id !== reviewId),
          }));
        } catch (error) {
          console.error("Error deleting review:", error);
          throw error;
        }
      },

      getReviewById: (reviewId) => {
        return get().reviews.find((review) => review.id === reviewId);
      },
    }),
    {
      name: "gear-review-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        reviews: state.reviews,
      }),
    }
  )
);

// Selector hooks for optimized subscriptions
export const useGearReviews = () => useGearReviewStore((state) => state.reviews);
export const useGearReviewsLoading = () => useGearReviewStore((state) => state.isLoading);
