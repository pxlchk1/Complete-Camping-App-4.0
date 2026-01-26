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

  gearItems.forEach((gear) => {
    const sectionTitle = getPackingSectionForGear(gear.category);
    const normalizedGearName = normalizeName(gear.name);

    // Skip if already exists (deduplication)
    if (existingNames.has(normalizedGearName)) {
      return;
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
