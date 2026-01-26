/**
 * Gear Closet Types
 * Types for managing user's personal gear collection
 */

import { Timestamp } from "firebase/firestore";

export type GearCategory = 
  | "camp_comfort"
  | "campFurniture"
  | "clothing" 
  | "documents_essentials"
  | "electronics"
  | "entertainment"
  | "food"
  | "hygiene"
  | "kitchen" 
  | "lighting"
  | "meal_prep"
  | "optional_extras"
  | "pet_supplies"
  | "safety"
  | "seating"
  | "shelter" 
  | "sleep" 
  | "tools"
  | "water";

export interface GearItem {
  id: string;
  ownerId: string;
  name: string;
  category: GearCategory;
  brand?: string;
  model?: string;
  weight?: string;
  notes?: string;
  imageUrl?: string;
  isFavorite: boolean;
  createdAt: Timestamp | string;
  updatedAt: Timestamp | string;
}

export interface CreateGearData {
  name: string;
  category: GearCategory;
  brand?: string;
  model?: string;
  weight?: string;
  notes?: string;
  imageUrl?: string;
  isFavorite?: boolean;
}

export interface UpdateGearData {
  name?: string;
  category?: GearCategory;
  brand?: string | null;
  model?: string | null;
  weight?: string | null;
  notes?: string | null;
  imageUrl?: string | null;
  isFavorite?: boolean;
}

export const GEAR_CATEGORIES: { value: GearCategory; label: string }[] = [
  { value: "camp_comfort", label: "Camp Comfort" },
  { value: "campFurniture", label: "Camp Furniture" },
  { value: "clothing", label: "Clothing" },
  { value: "documents_essentials", label: "Documents & Essentials" },
  { value: "electronics", label: "Electronics" },
  { value: "entertainment", label: "Entertainment" },
  { value: "food", label: "Cooking & Food" },
  { value: "hygiene", label: "Hygiene" },
  { value: "kitchen", label: "Kitchen" },
  { value: "lighting", label: "Lighting" },
  { value: "meal_prep", label: "Meal Prep" },
  { value: "optional_extras", label: "Optional Extras" },
  { value: "pet_supplies", label: "Pet Supplies" },
  { value: "safety", label: "Safety" },
  { value: "seating", label: "Seating" },
  { value: "shelter", label: "Shelter" },
  { value: "sleep", label: "Sleep" },
  { value: "tools", label: "Tools" },
  { value: "water", label: "Water" },
];
