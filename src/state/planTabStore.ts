import { create } from "zustand";

export type PlanTab = "trips" | "parks" | "weather";

interface PlanTabState {
  activeTab: PlanTab;
  setActiveTab: (tab: PlanTab) => void;
  
  // Trip context for destination picker flow
  // When set, Parks tab will show "Set as destination" button instead of "Add to trip"
  destinationPickerTripId: string | null;
  setDestinationPickerTripId: (tripId: string | null) => void;
  
  // Trip context for weather picker flow
  // When set, Weather screen will navigate back to TripDetail after adding weather
  weatherPickerTripId: string | null;
  setWeatherPickerTripId: (tripId: string | null) => void;
}

export const usePlanTabStore = create<PlanTabState>((set) => ({
  activeTab: "trips",
  setActiveTab: (tab) => set({ activeTab: tab }),
  
  destinationPickerTripId: null,
  setDestinationPickerTripId: (tripId) => set({ destinationPickerTripId: tripId }),
  
  weatherPickerTripId: null,
  setWeatherPickerTripId: (tripId) => set({ weatherPickerTripId: tripId }),
}));
