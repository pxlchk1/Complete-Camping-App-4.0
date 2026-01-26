import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CampingStyleValue } from "../types/camping";

export type TripSegment = "active" | "completed" | "all";
export type TripSort = "startSoonest" | "updatedRecent" | "az";

export interface TripsFilter {
  dateFrom?: string | null; // ISO yyyy-mm-dd
  dateTo?: string | null; // ISO yyyy-mm-dd
  campingStyle?: CampingStyleValue | "any";
  states?: string[]; // state codes like "CA"
}

interface TripsListState {
  segment: TripSegment;
  sortBy: TripSort;
  filters: TripsFilter;
  pageBySegment: Record<TripSegment, number>; // 1-based pages

  setSegment: (seg: TripSegment) => void;
  setSortBy: (sort: TripSort) => void;
  setFilters: (f: Partial<TripsFilter>) => void;
  resetFilters: () => void;
  incrementPage: (seg: TripSegment) => void;
  resetPaging: (seg?: TripSegment) => void;
}

const initialFilters: TripsFilter = {
  dateFrom: null,
  dateTo: null,
  campingStyle: "any",
  states: [],
};

export const useTripsListStore = create<TripsListState>()(
  persist(
    (set, get) => ({
      segment: "active",
      sortBy: "startSoonest",
      filters: initialFilters,
      pageBySegment: { active: 1, completed: 1, all: 1 },

      setSegment: (seg) => set((s) => ({ segment: seg })),
      setSortBy: (sort) => set({ sortBy: sort }),
      setFilters: (f) => set((s) => ({ filters: { ...s.filters, ...f } })),
      resetFilters: () => set({ filters: initialFilters }),
      incrementPage: (seg) =>
        set((s) => ({
          pageBySegment: {
            ...s.pageBySegment,
            [seg]: (s.pageBySegment[seg] || 1) + 1,
          },
        })),
      resetPaging: (seg) => {
        if (seg)
          set((s) => ({ pageBySegment: { ...s.pageBySegment, [seg]: 1 } }));
        else set({ pageBySegment: { active: 1, completed: 1, all: 1 } });
      },
    }),
    {
      name: "trips-list-prefs",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        segment: s.segment,
        sortBy: s.sortBy,
        filters: s.filters,
      }),
    }
  )
);
