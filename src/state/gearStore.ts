import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { PackingList, GearCategory, GearItem } from "../types/camping";

interface GearState {
  packingLists: PackingList[];
  addPackingList: (list: Omit<PackingList, "id" | "createdAt" | "updatedAt">) => string;
  updatePackingList: (id: string, updates: Partial<PackingList>) => void;
  deletePackingList: (id: string) => void;
  getPackingListById: (id: string) => PackingList | undefined;
  getPackingListsByTripId: (tripId: string) => PackingList[];
  toggleItemPacked: (listId: string, categoryId: string, itemId: string) => void;
  getPackingProgress: (listId: string) => { packed: number; total: number; percentage: number };
}

export const useGearStore = create<GearState>()(
  persist(
    (set, get) => ({
      packingLists: [],

      addPackingList: (listData) => {
        const newList: PackingList = {
          ...listData,
          id: `list_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set((state) => ({
          packingLists: [newList, ...state.packingLists],
        }));
        return newList.id;
      },

      updatePackingList: (id, updates) => {
        set((state) => ({
          packingLists: state.packingLists.map((list) =>
            list.id === id
              ? { ...list, ...updates, updatedAt: new Date().toISOString() }
              : list
          ),
        }));
      },

      deletePackingList: (id) => {
        set((state) => ({
          packingLists: state.packingLists.filter((list) => list.id !== id),
        }));
      },

      getPackingListById: (id) => {
        return get().packingLists.find((list) => list.id === id);
      },

      getPackingListsByTripId: (tripId) => {
        return get().packingLists.filter((list) => list.tripId === tripId);
      },

      toggleItemPacked: (listId, categoryId, itemId) => {
        set((state) => ({
          packingLists: state.packingLists.map((list) => {
            if (list.id !== listId) return list;

            return {
              ...list,
              categories: list.categories.map((category) => {
                if (category.id !== categoryId) return category;

                return {
                  ...category,
                  items: category.items.map((item) =>
                    item.id === itemId ? { ...item, packed: !item.packed } : item
                  ),
                };
              }),
              updatedAt: new Date().toISOString(),
            };
          }),
        }));
      },

      getPackingProgress: (listId) => {
        const list = get().getPackingListById(listId);
        if (!list) return { packed: 0, total: 0, percentage: 0 };

        let packed = 0;
        let total = 0;

        list.categories.forEach((category) => {
          category.items.forEach((item) => {
            total++;
            if (item.packed) packed++;
          });
        });

        const percentage = total > 0 ? Math.round((packed / total) * 100) : 0;
        return { packed, total, percentage };
      },
    }),
    {
      name: "gear-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
