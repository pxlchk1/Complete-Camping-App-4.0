import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { LibraryImage, ImageCategory } from "../types/community";
import { fetchPhotos, uploadPhoto, deletePhoto, votePhoto } from "../api/photo-service";

interface ImageLibraryState {
  images: LibraryImage[];
  isLoading: boolean;
  searchQuery: string;
  selectedCategory: ImageCategory | "all";
  sortBy: "date" | "score" | "hot";
  favorites: string[];

  // Actions
  syncFromFirebase: (userId?: string) => Promise<void>;
  addImage: (
    localUri: string,
    title: string,
    description: string,
    category: ImageCategory,
    tags: string[],
    userId: string,
    userHandle: string,
    userName?: string,
    isPrivate?: boolean
  ) => Promise<string>;
  removeImage: (imageId: string, userId: string, isAdmin?: boolean) => Promise<void>;
  voteImage: (imageId: string, userId: string, voteType: "up" | "down") => Promise<void>;
  toggleFavorite: (imageId: string) => void;
  setSearchQuery: (query: string) => void;
  setSelectedCategory: (category: ImageCategory | "all") => void;
  setSortBy: (sortBy: "date" | "score" | "hot") => void;
  getFilteredImages: () => LibraryImage[];
}

export const useImageLibraryStore = create<ImageLibraryState>()(
  persist(
    (set, get) => ({
      images: [],
      isLoading: false,
      searchQuery: "",
      selectedCategory: "all",
      sortBy: "date",
      favorites: [],

      syncFromFirebase: async (userId) => {
        try {
          set({ isLoading: true });
          const images = await fetchPhotos(userId);
          set({ images, isLoading: false });
        } catch (error) {
          console.error("Error syncing images:", error);
          set({ isLoading: false });
        }
      },

      addImage: async (localUri, title, description, category, tags, userId, userHandle, userName, isPrivate) => {
        try {
          const imageId = await uploadPhoto(
            localUri,
            title,
            description,
            category,
            tags,
            userId,
            userHandle,
            userName,
            isPrivate
          );
          await get().syncFromFirebase(userId);
          return imageId;
        } catch (error) {
          console.error("Error adding image:", error);
          throw error;
        }
      },

      removeImage: async (imageId, userId, isAdmin = false) => {
        try {
          await deletePhoto(imageId, userId, isAdmin);
          set((state) => ({
            images: state.images.filter((img) => img.id !== imageId),
            favorites: state.favorites.filter((id) => id !== imageId),
          }));
        } catch (error) {
          console.error("Error removing image:", error);
          throw error;
        }
      },

      voteImage: async (imageId, userId, voteType) => {
        try {
          // Optimistic update
          set((state) => ({
            images: state.images.map((img) => {
              if (img.id !== imageId) return img;

              const currentVote = img.userVote;
              let upvotes = img.upvotes;
              let downvotes = img.downvotes;
              let newUserVote: "up" | "down" | null = voteType;

              // Remove previous vote
              if (currentVote === "up") upvotes--;
              if (currentVote === "down") downvotes--;

              // If clicking same vote, remove it
              if (currentVote === voteType) {
                newUserVote = null;
              } else {
                // Add new vote
                if (voteType === "up") upvotes++;
                if (voteType === "down") downvotes++;
              }

              return {
                ...img,
                upvotes,
                downvotes,
                score: upvotes - downvotes,
                userVote: newUserVote,
              };
            }),
          }));

          await votePhoto(imageId, userId, voteType);
        } catch (error) {
          console.error("Error voting on image:", error);
          // Revert on error
          await get().syncFromFirebase(userId);
        }
      },

      toggleFavorite: (imageId) =>
        set((state) => ({
          favorites: state.favorites.includes(imageId)
            ? state.favorites.filter((id) => id !== imageId)
            : [...state.favorites, imageId],
        })),

      setSearchQuery: (query) => set({ searchQuery: query }),

      setSelectedCategory: (category) => set({ selectedCategory: category }),

      setSortBy: (sortBy) => set({ sortBy }),

      getFilteredImages: () => {
        const { images, searchQuery, selectedCategory, sortBy } = get();
        let filtered = [...images];

        // Filter by category
        if (selectedCategory !== "all") {
          filtered = filtered.filter((img) => img.category === selectedCategory);
        }

        // Filter by search
        if (searchQuery.trim()) {
          const searchLower = searchQuery.toLowerCase();
          filtered = filtered.filter(
            (img) =>
              img.title.toLowerCase().includes(searchLower) ||
              img.description?.toLowerCase().includes(searchLower) ||
              img.tags.some((tag) => tag.toLowerCase().includes(searchLower))
          );
        }

        // Sort
        filtered.sort((a, b) => {
          if (sortBy === "date") {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          } else if (sortBy === "score") {
            return b.score - a.score;
          } else if (sortBy === "hot") {
            // Hot algorithm: score / time_hours
            const aHours = (Date.now() - new Date(a.createdAt).getTime()) / (1000 * 60 * 60);
            const bHours = (Date.now() - new Date(b.createdAt).getTime()) / (1000 * 60 * 60);
            const aHot = a.score / Math.max(aHours, 1);
            const bHot = b.score / Math.max(bHours, 1);
            return bHot - aHot;
          }
          return 0;
        });

        return filtered;
      },
    }),
    {
      name: "image-library-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        images: state.images,
        favorites: state.favorites,
        sortBy: state.sortBy,
      }),
    }
  )
);
