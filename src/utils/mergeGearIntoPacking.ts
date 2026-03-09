/**
 * Merge Gear Closet Items into Packing List Sections
 * Adds user's gear items to the appropriate packing sections without duplicates
 */

import { GearItem } from "../types/gear";
import { PackingSection, PackingItem } from "../state/packingStore";
import { getPackingSectionForGear } from "./gearToPackingCategory";

/**
 * Generate a unique ID for packing items
 */
function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Normalize a name for comparison (lowercase, trim, collapse whitespace)
 */
function normalizeName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, " ");
}

/**
 * Map gear closet categories to functional groups for shelter/sleep dedup.
 * When a user's gear item matches a group, generic template items in that
 * group are replaced by the user's owned gear.
 */
const GEAR_CATEGORY_TO_GROUP: Record<string, string> = {
  shelter: "tent",
};

/**
 * Merge gear closet items into packing list sections
 * 
 * @param sections - Existing packing sections (from templates or empty)
 * @param gearItems - User's gear closet items to merge in
 * @returns Updated sections with gear items added to appropriate sections
 */
export function mergeGearIntoPacking(
  sections: PackingSection[],
  gearItems: GearItem[]
): PackingSection[] {
  // Clone sections to avoid mutation
  const updatedSections = sections.map((section) => ({
    ...section,
    items: [...section.items],
  }));

  // Build a set of existing item names (normalized) for deduplication
  const existingNames = new Set<string>();
  updatedSections.forEach((section) => {
    section.items.forEach((item) => {
      existingNames.add(normalizeName(item.name));
    });
  });

  // Group gear items by their target packing section
  const gearBySection: Record<string, PackingItem[]> = {};
  // Track which functional groups gear closet items will replace
  const groupsToReplace: Record<string, Set<string>> = {};

  gearItems.forEach((gear) => {
    const sectionTitle = getPackingSectionForGear(gear.category);
    const normalizedGearName = normalizeName(gear.name);

    // Skip if already exists (exact name deduplication)
    if (existingNames.has(normalizedGearName)) {
      return;
    }

    // Check if this gear category maps to a functional group
    const gearGroup = GEAR_CATEGORY_TO_GROUP[gear.category];
    if (gearGroup) {
      if (!groupsToReplace[sectionTitle]) {
        groupsToReplace[sectionTitle] = new Set();
      }
      groupsToReplace[sectionTitle].add(gearGroup);
    }

    // Create packing item from gear
    const packingItem: PackingItem = {
      id: generateId(),
      name: gear.name,
      checked: false,
      essential: false,
      source: "gearCloset",
      gearItemId: gear.id,
    };

    if (!gearBySection[sectionTitle]) {
      gearBySection[sectionTitle] = [];
    }
    gearBySection[sectionTitle].push(packingItem);

    // Mark as added to prevent future duplicates
    existingNames.add(normalizedGearName);
  });

  // Add gear items to their target sections
  Object.entries(gearBySection).forEach(([sectionTitle, items]) => {
    // Find existing section
    let targetSection = updatedSections.find(
      (s) => s.title.toLowerCase() === sectionTitle.toLowerCase()
    );

    // If section doesn't exist, create it
    if (!targetSection) {
      targetSection = {
        id: generateId(),
        title: sectionTitle,
        items: [],
        collapsed: false,
      };
      updatedSections.push(targetSection);
    }

    // Remove generic template items whose functional group is replaced by gear closet items
    const replacedGroups = groupsToReplace[sectionTitle];
    if (replacedGroups && replacedGroups.size > 0) {
      targetSection.items = targetSection.items.filter(
        (item) => !item.group || !replacedGroups.has(item.group)
      );
    }

    // Append gear items to the section (after template items)
    targetSection.items.push(...items);
  });

  return updatedSections;
}

/**
 * Check if an item is from the Gear Closet
 */
export function isGearClosetItem(item: PackingItem): boolean {
  return item.source === "gearCloset" || !!item.gearItemId;
}
