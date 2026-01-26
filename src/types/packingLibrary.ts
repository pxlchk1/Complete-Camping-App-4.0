/**
 * Packing Library Types
 * Type definitions for the global packing library and trip packing lists
 */

import { Timestamp } from "firebase/firestore";

// ============================================================================
// GLOBAL LIBRARY TYPES (read-only, shared across all users)
// ============================================================================

/**
 * Global packing category definition
 * Stored in: /packingLibraryCategories/{categoryId}
 */
export interface PackingLibraryCategory {
  id: string; // Normalized category ID (e.g., "safety_and_first_aid")
  label: string; // Display label (e.g., "Safety and First Aid")
  order: number; // Sort order for display
  icon?: string; // Optional Ionicons icon name
}

/**
 * Tags for matching items to trip context
 */
export interface PackingItemTags {
  seasons: ("winter" | "summer" | "shoulder" | "any")[]; // When this item is relevant
  temps: ("below_freezing" | "cold" | "mild" | "hot" | "any")[]; // Temperature conditions
  wind: ("windy" | "any")[]; // Wind conditions
  precip: ("rain" | "snow" | "any")[]; // Precipitation conditions
  styles: ("car_camping" | "backpacking" | "hammock" | "rv" | "any")[]; // Camping styles
  locations?: string[]; // Optional location hints ["coastal", "desert", "mountains"]
  tripTypes?: string[]; // Optional trip types ["family", "solo", "photo"]
  base?: boolean; // If true, this is a base item that should always be included
}

/**
 * Gating rules for premium items
 */
export interface PackingItemGating {
  proOnly?: boolean;
}

/**
 * Global packing library item definition
 * Stored in: /packingLibraryItems/{itemId}
 */
export interface PackingLibraryItem {
  id: string;
  name: string;
  categoryId: string; // References PackingLibraryCategory.id
  defaultQty: number;
  priority: number; // 1-5, higher = more important
  notes?: string;
  tags: PackingItemTags;
  gating?: PackingItemGating;
}

// ============================================================================
// TRIP-SPECIFIC PACKING TYPES
// ============================================================================

/**
 * Source of how an item was added to the packing list
 */
export type PackingItemSource = "base" | "suggested" | "user";

/**
 * Trip packing list item
 * Stored in: /users/{uid}/trips/{tripId}/packingList/{tripItemId}
 */
export interface TripPackingItem {
  id: string;
  name: string;
  categoryId: string; // References PackingLibraryCategory.id
  qty: number;
  isPacked: boolean;
  source: PackingItemSource;
  libraryItemId?: string; // Reference to original library item
  addedReason?: string; // e.g., "Winter", "Wind", "Backpacking"
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

/**
 * Suggestion status for tracking dismissed/added suggestions
 */
export type SuggestionStatus = "new" | "added" | "dismissed";

/**
 * Trip packing suggestion tracking
 * Stored in: /users/{uid}/trips/{tripId}/packingSuggestions/{libraryItemId}
 */
export interface TripPackingSuggestion {
  libraryItemId: string;
  status: SuggestionStatus;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

/**
 * Computed suggestion with library item data
 * Used for UI display
 */
export interface PackingSuggestion extends PackingLibraryItem {
  reason: string; // Why this is being suggested
}

// ============================================================================
// UI TYPES
// ============================================================================

/**
 * Category group for UI display
 */
export interface PackingCategoryGroup {
  categoryId: string;
  label: string;
  icon?: string;
  order: number;
  items: TripPackingItem[];
  packedCount: number;
  totalCount: number;
}

/**
 * Packing list state for UI
 */
export interface PackingListState {
  isInitialized: boolean;
  version: number;
  categories: PackingCategoryGroup[];
  suggestions: PackingSuggestion[];
  totalItems: number;
  packedItems: number;
}
