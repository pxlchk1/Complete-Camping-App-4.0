import { create } from "zustand";

interface LocationState {
  // Selected location from Parks finder or user input
  selectedLocation: {
    name: string;
    latitude: number;
    longitude: number;
    state?: string;
  } | null;

  // User's current location
  userLocation: {
    latitude: number;
    longitude: number;
  } | null;

  setSelectedLocation: (location: LocationState["selectedLocation"]) => void;
  setUserLocation: (location: LocationState["userLocation"]) => void;
  clearSelectedLocation: () => void;
}

export const useLocationStore = create<LocationState>()((set) => ({
  selectedLocation: null,
  userLocation: null,

  setSelectedLocation: (location) => set({ selectedLocation: location }),
  setUserLocation: (location) => set({ userLocation: location }),
  clearSelectedLocation: () => set({ selectedLocation: null }),
}));
