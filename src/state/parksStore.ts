import { create } from "zustand";
import { Park } from "../types/camping";

type ParkFilter = "national_park" | "state_park" | "national_forest" | "all";

interface ParksState {
  parks: Park[];
  filteredParks: Park[];
  filters: {
    types: ParkFilter[];
    state?: string;
    searchQuery?: string;
  };
  setParks: (parks: Park[]) => void;
  setFilters: (filters: Partial<ParksState["filters"]>) => void;
  clearFilters: () => void;
  getParkById: (id: string) => Park | undefined;
}

export const useParksStore = create<ParksState>()((set, get) => ({
  parks: [],
  filteredParks: [],
  filters: {
    types: [],
  },

  setParks: (parks) => {
    set({ parks, filteredParks: parks });
  },

  setFilters: (newFilters) => {
    const filters = { ...get().filters, ...newFilters };
    set({ filters });

    // Apply filters
    const allParks = get().parks;
    let filtered = allParks;

    if (filters.types.length > 0) {
      filtered = filtered.filter((park) => filters.types.includes(park.filter as ParkFilter));
    }

    if (filters.state) {
      filtered = filtered.filter((park) =>
        park.state.toLowerCase() === filters.state?.toLowerCase()
      );
    }

    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(
        (park) =>
          park.name.toLowerCase().includes(query) ||
          park.address.toLowerCase().includes(query) ||
          park.state.toLowerCase().includes(query)
      );
    }

    set({ filteredParks: filtered });
  },

  clearFilters: () => {
    set({
      filters: { types: [] },
      filteredParks: get().parks,
    });
  },

  getParkById: (id) => {
    return get().parks.find((park) => park.id === id);
  },
}));
