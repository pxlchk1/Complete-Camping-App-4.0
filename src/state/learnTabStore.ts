import { create } from "zustand";

export type LearnTab = "learn" | "badges";

interface LearnTabState {
  activeTab: LearnTab;
  setActiveTab: (tab: LearnTab) => void;
}

export const useLearnTabStore = create<LearnTabState>((set) => ({
  activeTab: "learn",
  setActiveTab: (tab) => set({ activeTab: tab }),
}));
