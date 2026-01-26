/**
 * Packing Store - Local-first Zustand store for packing lists
 * Stores data in AsyncStorage, no cloud sync
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { useShallow } from "zustand/react/shallow";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getTemplatesByKeys, DEFAULT_SECTIONS } from "../constants/packingTemplatesV2";
import { GearItem } from "../types/gear";
import { mergeGearIntoPacking } from "../utils/mergeGearIntoPacking";

// ============================================================================
// TYPES
// ============================================================================

export type TripType =
  | "one-night"
  | "weekend"
  | "multi-day"
  | "backpacking"
  | "car-camping"
  | "day-hike";

export type Season = "spring" | "summer" | "fall" | "winter";

export type PackingTemplateKey =
  | "essential"
  | "cooking"
  | "safety"
  | "clothing"
  | "meals"
  | "backpacking"
  | "car-camping"
  | "winter"
  | "pets"
  | "family";

export type PackingItemSource = "template" | "gearCloset" | "custom";

export interface PackingItem {
  id: string;
  name: string;
  checked: boolean;
  note?: string;
  essential?: boolean;
  source?: PackingItemSource;
  gearItemId?: string; // Link to Gear Closet item
}

export interface PackingSection {
  id: string;
  title: string;
  items: PackingItem[];
  collapsed?: boolean;
}

export interface PackingList {
  id: string;
  name: string;
  tripType: TripType;
  season: Season;
  sections: PackingSection[];
  createdAt: string;
  updatedAt: string;
  tripId?: string; // Optional link to a trip
  isTemplate?: boolean; // True if this is a reusable template
  meta?: {
    doNotPromptFirstAid?: boolean;
  };
}

// ============================================================================
// STORE INTERFACE
// ============================================================================

interface PackingState {
  packingLists: PackingList[];

  // List CRUD
  createPackingList: (
    name: string,
    tripType: TripType,
    season: Season,
    templateKeys?: PackingTemplateKey[],
    tripId?: string,
    isTemplate?: boolean,
    gearItems?: GearItem[]
  ) => string;
  deletePackingList: (listId: string) => void;
  getPackingListById: (listId: string) => PackingList | undefined;
  getPackingListsByTripId: (tripId: string) => PackingList[];

  // Section Operations
  addSection: (listId: string, title: string) => string | null;
  renameSection: (listId: string, sectionId: string, title: string) => void;
  deleteSection: (listId: string, sectionId: string) => void;
  reorderSections: (listId: string, fromIndex: number, toIndex: number) => void;
  toggleSectionCollapsed: (listId: string, sectionId: string) => void;

  // Item Operations
  addItem: (listId: string, sectionId: string, name: string, essential?: boolean) => string | null;
  updateItem: (listId: string, sectionId: string, itemId: string, updates: Partial<PackingItem>) => void;
  deleteItem: (listId: string, sectionId: string, itemId: string) => void;
  toggleItemChecked: (listId: string, sectionId: string, itemId: string) => void;
  duplicateItem: (listId: string, sectionId: string, itemId: string) => void;

  // Bulk Operations
  checkAllItems: (listId: string) => void;
  uncheckAllItems: (listId: string) => void;

  // Progress
  getProgress: (listId: string) => { packed: number; total: number; percentage: number };
  
  // First aid prompt
  setDoNotPromptFirstAid: (listId: string, value: boolean) => void;

  // Template Operations
  saveAsTemplate: (listId: string, newName?: string) => string | null;
  copyTemplateToTrip: (templateId: string, tripId?: string) => string | null;
  toggleTemplateStatus: (listId: string) => void;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

export const usePackingStore = create<PackingState>()(
  persist(
    (set, get) => ({
      packingLists: [],

      // ========================================================================
      // LIST CRUD
      // ========================================================================

      createPackingList: (name, tripType, season, templateKeys, tripId, isTemplate, gearItems) => {
        const id = generateId();
        const now = new Date().toISOString();

        // Build sections from templates
        let sections: PackingSection[] = [];

        if (templateKeys && templateKeys.length > 0) {
          const templates = getTemplatesByKeys(templateKeys);
          
          // Group items by category
          const itemsByCategory: Record<string, PackingItem[]> = {};
          
          templates.forEach((template: any) => {
            template.items.forEach((item: any) => {
              const category = item.category || "Other";
              if (!itemsByCategory[category]) {
                itemsByCategory[category] = [];
              }
              
              // Check for duplicates
              const exists = itemsByCategory[category].some(
                (existing) => existing.name.toLowerCase() === item.name.toLowerCase()
              );
              
              if (!exists) {
                itemsByCategory[category].push({
                  id: generateId(),
                  name: item.name,
                  checked: false,
                  essential: item.essential,
                  source: "template",
                });
              }
            });
          });

          // Convert to sections
          sections = Object.entries(itemsByCategory).map(([title, items]) => ({
            id: generateId(),
            title,
            items,
            collapsed: false,
          }));
        } else {
          // Use default empty sections
          sections = DEFAULT_SECTIONS.map((title: string) => ({
            id: generateId(),
            title,
            items: [],
            collapsed: false,
          }));
        }

        // Merge gear closet items if provided
        if (gearItems && gearItems.length > 0) {
          sections = mergeGearIntoPacking(sections, gearItems);
        }

        const newList: PackingList = {
          id,
          name,
          tripType,
          season,
          sections,
          createdAt: now,
          updatedAt: now,
          tripId,
          isTemplate: isTemplate || false,
        };

        set((state) => ({
          packingLists: [newList, ...state.packingLists],
        }));

        return id;
      },

      deletePackingList: (listId) => {
        set((state) => ({
          packingLists: state.packingLists.filter((list) => list.id !== listId),
        }));
      },

      getPackingListById: (listId) => {
        return get().packingLists.find((list) => list.id === listId);
      },

      getPackingListsByTripId: (tripId) => {
        return get().packingLists.filter((list) => list.tripId === tripId);
      },

      // ========================================================================
      // SECTION OPERATIONS
      // ========================================================================

      addSection: (listId, title) => {
        const sectionId = generateId();

        set((state) => ({
          packingLists: state.packingLists.map((list) => {
            if (list.id !== listId) return list;

            return {
              ...list,
              sections: [
                ...list.sections,
                { id: sectionId, title, items: [], collapsed: false },
              ],
              updatedAt: new Date().toISOString(),
            };
          }),
        }));

        return sectionId;
      },

      renameSection: (listId, sectionId, title) => {
        set((state) => ({
          packingLists: state.packingLists.map((list) => {
            if (list.id !== listId) return list;

            return {
              ...list,
              sections: list.sections.map((section) =>
                section.id === sectionId ? { ...section, title } : section
              ),
              updatedAt: new Date().toISOString(),
            };
          }),
        }));
      },

      deleteSection: (listId, sectionId) => {
        set((state) => ({
          packingLists: state.packingLists.map((list) => {
            if (list.id !== listId) return list;

            return {
              ...list,
              sections: list.sections.filter((s) => s.id !== sectionId),
              updatedAt: new Date().toISOString(),
            };
          }),
        }));
      },

      reorderSections: (listId, fromIndex, toIndex) => {
        set((state) => ({
          packingLists: state.packingLists.map((list) => {
            if (list.id !== listId) return list;

            const sections = [...list.sections];
            const [moved] = sections.splice(fromIndex, 1);
            sections.splice(toIndex, 0, moved);

            return {
              ...list,
              sections,
              updatedAt: new Date().toISOString(),
            };
          }),
        }));
      },

      toggleSectionCollapsed: (listId, sectionId) => {
        set((state) => ({
          packingLists: state.packingLists.map((list) => {
            if (list.id !== listId) return list;

            return {
              ...list,
              sections: list.sections.map((section) =>
                section.id === sectionId
                  ? { ...section, collapsed: !section.collapsed }
                  : section
              ),
            };
          }),
        }));
      },

      // ========================================================================
      // ITEM OPERATIONS
      // ========================================================================

      addItem: (listId, sectionId, name, essential) => {
        const itemId = generateId();

        set((state) => ({
          packingLists: state.packingLists.map((list) => {
            if (list.id !== listId) return list;

            return {
              ...list,
              sections: list.sections.map((section) => {
                if (section.id !== sectionId) return section;

                return {
                  ...section,
                  items: [
                    ...section.items,
                    { id: itemId, name, checked: false, essential },
                  ],
                };
              }),
              updatedAt: new Date().toISOString(),
            };
          }),
        }));

        return itemId;
      },

      updateItem: (listId, sectionId, itemId, updates) => {
        set((state) => ({
          packingLists: state.packingLists.map((list) => {
            if (list.id !== listId) return list;

            return {
              ...list,
              sections: list.sections.map((section) => {
                if (section.id !== sectionId) return section;

                return {
                  ...section,
                  items: section.items.map((item) =>
                    item.id === itemId ? { ...item, ...updates } : item
                  ),
                };
              }),
              updatedAt: new Date().toISOString(),
            };
          }),
        }));
      },

      deleteItem: (listId, sectionId, itemId) => {
        set((state) => ({
          packingLists: state.packingLists.map((list) => {
            if (list.id !== listId) return list;

            return {
              ...list,
              sections: list.sections.map((section) => {
                if (section.id !== sectionId) return section;

                return {
                  ...section,
                  items: section.items.filter((item) => item.id !== itemId),
                };
              }),
              updatedAt: new Date().toISOString(),
            };
          }),
        }));
      },

      toggleItemChecked: (listId, sectionId, itemId) => {
        set((state) => ({
          packingLists: state.packingLists.map((list) => {
            if (list.id !== listId) return list;

            return {
              ...list,
              sections: list.sections.map((section) => {
                if (section.id !== sectionId) return section;

                return {
                  ...section,
                  items: section.items.map((item) =>
                    item.id === itemId ? { ...item, checked: !item.checked } : item
                  ),
                };
              }),
              updatedAt: new Date().toISOString(),
            };
          }),
        }));
      },

      duplicateItem: (listId, sectionId, itemId) => {
        set((state) => ({
          packingLists: state.packingLists.map((list) => {
            if (list.id !== listId) return list;

            return {
              ...list,
              sections: list.sections.map((section) => {
                if (section.id !== sectionId) return section;

                const itemToDupe = section.items.find((i) => i.id === itemId);
                if (!itemToDupe) return section;

                return {
                  ...section,
                  items: [
                    ...section.items,
                    {
                      ...itemToDupe,
                      id: generateId(),
                      checked: false,
                    },
                  ],
                };
              }),
              updatedAt: new Date().toISOString(),
            };
          }),
        }));
      },

      // ========================================================================
      // BULK OPERATIONS
      // ========================================================================

      checkAllItems: (listId) => {
        set((state) => ({
          packingLists: state.packingLists.map((list) => {
            if (list.id !== listId) return list;

            return {
              ...list,
              sections: list.sections.map((section) => ({
                ...section,
                items: section.items.map((item) => ({ ...item, checked: true })),
              })),
              updatedAt: new Date().toISOString(),
            };
          }),
        }));
      },

      uncheckAllItems: (listId) => {
        set((state) => ({
          packingLists: state.packingLists.map((list) => {
            if (list.id !== listId) return list;

            return {
              ...list,
              sections: list.sections.map((section) => ({
                ...section,
                items: section.items.map((item) => ({ ...item, checked: false })),
              })),
              updatedAt: new Date().toISOString(),
            };
          }),
        }));
      },

      // ========================================================================
      // PROGRESS
      // ========================================================================

      getProgress: (listId) => {
        const list = get().packingLists.find((l) => l.id === listId);
        if (!list) return { packed: 0, total: 0, percentage: 0 };

        let packed = 0;
        let total = 0;

        list.sections.forEach((section) => {
          section.items.forEach((item) => {
            total++;
            if (item.checked) packed++;
          });
        });

        const percentage = total > 0 ? Math.round((packed / total) * 100) : 0;
        return { packed, total, percentage };
      },

      // ========================================================================
      // META
      // ========================================================================

      setDoNotPromptFirstAid: (listId, value) => {
        set((state) => ({
          packingLists: state.packingLists.map((list) => {
            if (list.id !== listId) return list;

            return {
              ...list,
              meta: { ...list.meta, doNotPromptFirstAid: value },
            };
          }),
        }));
      },

      // ========================================================================
      // TEMPLATE OPERATIONS
      // ========================================================================

      saveAsTemplate: (listId, newName) => {
        const list = get().packingLists.find((l) => l.id === listId);
        if (!list) return null;

        const templateId = generateId();
        const now = new Date().toISOString();

        // Clone sections with fresh IDs and unchecked items
        const clonedSections = list.sections.map((section) => ({
          id: generateId(),
          title: section.title,
          items: section.items.map((item) => ({
            id: generateId(),
            name: item.name,
            checked: false,
            note: item.note,
            essential: item.essential,
          })),
          collapsed: false,
        }));

        const template: PackingList = {
          id: templateId,
          name: newName || `${list.name} Template`,
          tripType: list.tripType,
          season: list.season,
          sections: clonedSections,
          createdAt: now,
          updatedAt: now,
          isTemplate: true,
        };

        set((state) => ({
          packingLists: [template, ...state.packingLists],
        }));

        return templateId;
      },

      copyTemplateToTrip: (templateId, tripId) => {
        const template = get().packingLists.find((l) => l.id === templateId);
        if (!template) return null;

        const listId = generateId();
        const now = new Date().toISOString();

        // Clone sections with fresh IDs
        const clonedSections = template.sections.map((section) => ({
          id: generateId(),
          title: section.title,
          items: section.items.map((item) => ({
            id: generateId(),
            name: item.name,
            checked: false,
            note: item.note,
            essential: item.essential,
          })),
          collapsed: false,
        }));

        const newList: PackingList = {
          id: listId,
          name: template.name.replace(" Template", ""),
          tripType: template.tripType,
          season: template.season,
          sections: clonedSections,
          createdAt: now,
          updatedAt: now,
          tripId,
          isTemplate: false,
        };

        set((state) => ({
          packingLists: [newList, ...state.packingLists],
        }));

        return listId;
      },

      toggleTemplateStatus: (listId) => {
        set((state) => ({
          packingLists: state.packingLists.map((list) => {
            if (list.id !== listId) return list;

            return {
              ...list,
              isTemplate: !list.isTemplate,
              tripId: !list.isTemplate ? undefined : list.tripId, // Clear tripId when making template
              updatedAt: new Date().toISOString(),
            };
          }),
        }));
      },
    }),
    {
      name: "tent-lantern-packing",
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
    }
  )
);

// ============================================================================
// SELECTORS
// ============================================================================

export const usePackingLists = () => usePackingStore((s) => s.packingLists);

export const usePackingListById = (listId: string) =>
  usePackingStore((s) => s.packingLists.find((l) => l.id === listId));

export const usePackingListsByTripId = (tripId: string | undefined) =>
  usePackingStore(
    useShallow((s) =>
      tripId ? s.packingLists.filter((l) => l.tripId === tripId) : []
    )
  );

// Template-specific selectors - useShallow for stable array references
export const usePackingTemplates = () =>
  usePackingStore(
    useShallow((s) => s.packingLists.filter((l) => l.isTemplate))
  );

export const usePackingActiveLists = () =>
  usePackingStore(
    useShallow((s) => s.packingLists.filter((l) => !l.isTemplate))
  );
