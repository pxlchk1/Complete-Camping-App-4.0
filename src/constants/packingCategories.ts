/**
 * 🚫 LOCKED UX: PACKING LIST CATEGORIES (DO NOT REFACTOR)
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * This file defines the CANONICAL packing categories.
 * All packing list code must use these keys and derive labels from this mapping.
 * 
 * PROHIBITED CHANGES:
 * - Do not add new categories without product approval
 * - Do not change existing keys (would break existing data)
 * - Do not store categoryLabel as primary field on items
 * - Do not create duplicate categories with different casing
 * 
 * REQUIRED USAGE:
 * - Items must store categoryKey (from PACK_CATEGORY_KEYS)
 * - UI must derive label from getCategoryLabel(categoryKey)
 * - Normalization must map legacy labels to canonical keys
 */

export interface PackCategory {
  key: string;
  label: string;
  icon: string;
  order: number;
}

/**
 * Canonical packing categories - single source of truth
 */
export const PACK_CATEGORIES: PackCategory[] = [
  { key: "shelter", label: "Shelter", icon: "home-outline", order: 1 },
  { key: "sleep", label: "Sleep System", icon: "bed-outline", order: 2 },
  { key: "water", label: "Water", icon: "water-outline", order: 3 },
  { key: "kitchen", label: "Food and Kitchen", icon: "restaurant-outline", order: 4 },
  { key: "clothing", label: "Clothing", icon: "shirt-outline", order: 5 },
  { key: "layers", label: "Layers & Warmth", icon: "snow-outline", order: 6 },
  { key: "rain", label: "Rain & Weather", icon: "rainy-outline", order: 7 },
  { key: "footwear", label: "Footwear", icon: "footsteps-outline", order: 8 },
  { key: "hygiene", label: "Hygiene", icon: "sparkles-outline", order: 9 },
  { key: "safety", label: "Safety and First Aid", icon: "medkit-outline", order: 10 },
  { key: "navigation", label: "Navigation", icon: "compass-outline", order: 11 },
  { key: "tools", label: "Tools", icon: "construct-outline", order: 12 },
  { key: "personal", label: "Personal Items", icon: "person-outline", order: 13 },
  { key: "electronics", label: "Electronics", icon: "battery-charging-outline", order: 14 },
  { key: "tripSpecific", label: "Trip Specific", icon: "flag-outline", order: 15 },
];

/**
 * Valid category keys (for type safety)
 */
export const PACK_CATEGORY_KEYS = PACK_CATEGORIES.map(c => c.key);
export type PackCategoryKey = typeof PACK_CATEGORY_KEYS[number];

/**
 * Get category label from key
 */
export function getCategoryLabel(categoryKey: string): string {
  const category = PACK_CATEGORIES.find(c => c.key === categoryKey);
  return category?.label ?? categoryKey; // Fallback to key if not found
}

/**
 * Get category icon from key
 */
export function getCategoryIcon(categoryKey: string): string {
  const category = PACK_CATEGORIES.find(c => c.key === categoryKey);
  return category?.icon ?? "help-outline";
}

/**
 * Get category order from key
 */
export function getCategoryOrder(categoryKey: string): number {
  const category = PACK_CATEGORIES.find(c => c.key === categoryKey);
  return category?.order ?? 999;
}

/**
 * Legacy label to canonical key mapping
 * Used to normalize old data with inconsistent casing/naming
 */
const LEGACY_LABEL_MAP: Record<string, string> = {
  // Safety variations (note: navigation_and_safety maps to safety, not navigation)
  "safety and first aid": "safety",
  "safety & first aid": "safety",
  "first aid": "safety",
  "first_aid": "safety",
  "navigation_and_safety": "safety",
  "navigation & safety": "safety",
  
  // Sleep variations
  "sleep system": "sleep",
  "sleep_system": "sleep",
  "sleeping": "sleep",
  
  // Kitchen variations
  "food and kitchen": "kitchen",
  "food & kitchen": "kitchen",
  "cooking": "kitchen",
  "food": "kitchen",
  
  // Personal variations
  "personal items": "personal",
  "personal_items": "personal",
  
  // Trip specific variations
  "trip specific": "tripSpecific",
  "trip-specific": "tripSpecific",
  "trip_specific": "tripSpecific",
  
  // Tools variations
  "gear tools": "tools",
  
  // Layers variations
  "layers & warmth": "layers",
  "layers_and_warmth": "layers",
  
  // Rain variations  
  "rain & weather": "rain",
  "rain_and_weather": "rain",
  
  // Navigation variations
  "navigation": "navigation",
  
  // Direct key mappings (for existing categoryId fields from libraryData)
  "shelter": "shelter",
  "water": "water",
  "kitchen": "kitchen",
  "clothing": "clothing",
  "footwear": "footwear",
  "hygiene": "hygiene",
  "tools": "tools",
  "electronics": "electronics",
};

/**
 * Normalize a category label/key to canonical categoryKey
 * This is the safety net for legacy data with inconsistent naming
 * 
 * @param input - category label, key, or legacy value
 * @returns canonical categoryKey
 */
export function normalizeCategoryKey(input: string | undefined | null): string {
  if (!input) return "tripSpecific"; // Default fallback
  
  const normalized = input.toLowerCase().trim();
  
  // Check direct mapping first
  if (LEGACY_LABEL_MAP[normalized]) {
    return LEGACY_LABEL_MAP[normalized];
  }
  
  // Check if it's already a valid key
  if (PACK_CATEGORY_KEYS.includes(normalized)) {
    return normalized;
  }
  
  // Check if any category label matches (case insensitive)
  const matchingCategory = PACK_CATEGORIES.find(
    c => c.label.toLowerCase() === normalized
  );
  if (matchingCategory) {
    return matchingCategory.key;
  }
  
  // Default fallback
  console.warn(`[PackingCategories] Unknown category: "${input}", defaulting to tripSpecific`);
  return "tripSpecific";
}

/**
 * Check if a categoryKey is valid
 */
export function isValidCategoryKey(key: string): boolean {
  return PACK_CATEGORY_KEYS.includes(key);
}
