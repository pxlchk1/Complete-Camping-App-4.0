/**
 * Gear Closet to Packing List Category Mapping
 * Maps GearCategory values to Packing List section keys
 */

import { GearCategory } from "../types/gear";

/**
 * Maps GearCategory to Packing List section title
 * Uses the exact section titles from packingTemplatesV2.ts DEFAULT_SECTIONS
 */
export const gearCategoryToPackingSection: Record<GearCategory, string> = {
  camp_comfort: "Camp Furniture",
  campFurniture: "Camp Furniture",
  clothing: "Clothing",
  documents_essentials: "Other",
  electronics: "Tools & Utilities",
  entertainment: "Entertainment",
  food: "Cooking & Food",
  hygiene: "Personal Care",
  kitchen: "Meal Prep",
  lighting: "Navigation & Safety",
  meal_prep: "Meal Prep",
  optional_extras: "Other",
  pet_supplies: "Pet Supplies",
  safety: "Navigation & Safety",
  seating: "Camp Furniture",
  shelter: "Shelter & Sleep",
  sleep: "Shelter & Sleep",
  tools: "Tools & Utilities",
  water: "Meal Prep",
};

/**
 * Get the packing section title for a gear category
 */
export function getPackingSectionForGear(category: GearCategory): string {
  return gearCategoryToPackingSection[category] || "Other";
}

/**
 * All valid packing section titles (for ensuring sections exist)
 */
export const ALL_PACKING_SECTIONS = [
  "Camp Furniture",
  "Clothing",
  "Cooking & Food",
  "Entertainment",
  "Meal Prep",
  "Navigation & Safety",
  "Other",
  "Personal Care",
  "Pet Supplies",
  "Shelter & Sleep",
  "Tools & Utilities",
] as const;

export type PackingSectionTitle = typeof ALL_PACKING_SECTIONS[number];
