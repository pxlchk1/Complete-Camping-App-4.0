/**
 * Packing List V2 Types
 * Comprehensive packing system with templates, smart generation, and gear closet integration
 */

// ============================================================================
// CANONICAL CATEGORIES (fixed enum for consistent grouping)
// ============================================================================

export const PACKING_CATEGORIES = [
  "shelter",
  "sleep",
  "kitchen",
  "water",
  "food",
  "clothing",
  "footwear",
  "layers_warmth",
  "rain_weather",
  "hygiene",
  "first_aid",
  "navigation_safety",
  "lighting",
  "tools_repairs",
  "camp_comfort",
  "electronics",
  "documents_essentials",
  "optional_extras",
] as const;

export type PackingCategory = (typeof PACKING_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<PackingCategory, string> = {
  shelter: "Shelter",
  sleep: "Sleep",
  kitchen: "Kitchen",
  water: "Water",
  food: "Food",
  clothing: "Clothing",
  footwear: "Footwear",
  layers_warmth: "Layers & Warmth",
  rain_weather: "Rain & Weather",
  hygiene: "Hygiene",
  first_aid: "First Aid",
  navigation_safety: "Navigation & Safety",
  lighting: "Lighting",
  tools_repairs: "Tools & Repairs",
  camp_comfort: "Camp Comfort",
  electronics: "Electronics",
  documents_essentials: "Documents & Essentials",
  optional_extras: "Optional Extras",
};

export const CATEGORY_ICONS: Record<PackingCategory, string> = {
  shelter: "home",
  sleep: "bed",
  kitchen: "restaurant",
  water: "water",
  food: "fast-food",
  clothing: "shirt",
  footwear: "footsteps",
  layers_warmth: "snow",
  rain_weather: "rainy",
  hygiene: "sparkles",
  first_aid: "medkit",
  navigation_safety: "compass",
  lighting: "flashlight",
  tools_repairs: "hammer",
  camp_comfort: "happy",
  electronics: "phone-portrait",
  documents_essentials: "document-text",
  optional_extras: "add-circle",
};

// ============================================================================
// TRIP TYPES AND SEASONS
// ============================================================================

export const TRIP_TYPES = [
  "car_camping",
  "backpacking",
  "hammock",
  "rv_trailer",
  "cabin_glamping",
  "dispersed",
  "overlanding",
  "boat_canoe",
  "winter_camping",
  "family_camping",
] as const;

export type TripType = (typeof TRIP_TYPES)[number];

export const TRIP_TYPE_LABELS: Record<TripType, string> = {
  car_camping: "Car Camping",
  backpacking: "Backpacking",
  hammock: "Hammock Camping",
  rv_trailer: "RV / Trailer",
  cabin_glamping: "Cabin / Glamping",
  dispersed: "Dispersed Camping",
  overlanding: "Overlanding",
  boat_canoe: "Boat / Canoe Camping",
  winter_camping: "Winter Camping",
  family_camping: "Family Camping",
};

export const SEASONS = ["spring", "summer", "fall", "winter"] as const;
export type Season = (typeof SEASONS)[number];

export const SEASON_LABELS: Record<Season, string> = {
  spring: "Spring",
  summer: "Summer",
  fall: "Fall",
  winter: "Winter",
};

// Temperature profiles for gear selection
export type TemperatureProfile = "warm" | "mild" | "cold";

export const SEASON_TEMP_PROFILE: Record<Season, TemperatureProfile> = {
  summer: "warm",
  spring: "mild",
  fall: "mild",
  winter: "cold",
};

// ============================================================================
// GEAR GROUPS (for mutually exclusive selection)
// ============================================================================

export type GearGroup = "shelterPrimary" | "sleepPrimary" | "padPrimary";

export type GearVariant = "3season" | "4season" | "hammock" | "hottent" | "warm" | "mid" | "cold" | "standard" | "insulated";

// ============================================================================
// PACKING ITEM
// ============================================================================

export interface PackingItemV2 {
  id: string;
  name: string;
  category: PackingCategory;
  isEssential: boolean;
  isPacked: boolean;
  quantity: number;
  notes?: string;
  // Source tracking
  isFromGearCloset: boolean;
  gearClosetId?: string;
  gearItemId?: string; // Reference to gear closet item
  gearVariant?: GearVariant; // Variant of the gear item
  isFromTemplate: boolean;
  templateItemId?: string;
  // Gear group for smart selection
  gearGroup?: GearGroup;
  variant?: GearVariant;
  // Tags
  tags?: string[];
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// TRIP PACKING LIST (stored per trip)
// ============================================================================

export interface TripPackingList {
  id: string;
  tripId: string;
  userId: string;
  // Generation settings (stored for reference)
  generatedFrom?: {
    templateId: string;
    tripType: TripType;
    season: Season;
    nights: number;
    partySize: number;
    amenities: AmenityFlags;
  };
  // Progress
  totalItems: number;
  packedItems: number;
  // Status
  status: "draft" | "active" | "completed";
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// AMENITY FLAGS (for smart add-ons)
// ============================================================================

export interface AmenityFlags {
  runningWater: boolean;
  electricity: boolean;
  fireAllowed: boolean;
  bearLockers: boolean;
  laundryAccess: boolean;
}

export const DEFAULT_AMENITIES: AmenityFlags = {
  runningWater: false,
  electricity: false,
  fireAllowed: true,
  bearLockers: false,
  laundryAccess: false,
};

// ============================================================================
// PACKING TEMPLATE (user-saved or system)
// ============================================================================

export interface PackingTemplate {
  id: string;
  name: string;
  description?: string;
  // Ownership
  userId?: string; // null for system templates
  isSystem: boolean;
  // Matching criteria
  tripTypes: TripType[];
  seasons: Season[];
  defaultNights: number;
  tags: string[];
  // Stats
  itemCount: number;
  lastUsed?: string;
  useCount: number;
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

export interface PackingTemplateItem {
  id: string;
  templateId: string;
  name: string;
  category: PackingCategory;
  isEssential: boolean;
  quantity: number;
  notes?: string;
  // Gear group for smart selection
  gearGroup?: GearGroup;
  variant?: GearVariant;
  // For gear closet matching
  gearClosetEligible: boolean;
}

// ============================================================================
// GENERATION REQUEST
// ============================================================================

export interface PackingGenerationRequest {
  tripId: string;
  templateId?: string;
  tripType: TripType;
  season: Season;
  nights: number;
  partySize: number;
  amenities: AmenityFlags;
  // Optional weather override
  forecastLow?: number;
}

// ============================================================================
// FILTERS
// ============================================================================

export type PackingFilter = "all" | "unpacked" | "packed" | "essentials" | "gear-linked";

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getCategoryLabel(category: PackingCategory): string {
  return CATEGORY_LABELS[category] || category;
}

export function getCategoryIcon(category: PackingCategory): string {
  return CATEGORY_ICONS[category] || "cube";
}

export function getTripTypeLabel(tripType: TripType): string {
  return TRIP_TYPE_LABELS[tripType] || tripType;
}

export function getSeasonLabel(season: Season): string {
  return SEASON_LABELS[season] || season;
}

export function getTemperatureProfile(season: Season, forecastLow?: number): TemperatureProfile {
  // Weather override rules
  if (forecastLow !== undefined) {
    if (forecastLow <= 32) return "cold";
    if (forecastLow >= 55) return "warm";
  }
  return SEASON_TEMP_PROFILE[season];
}

export function calculateProgress(packedItems: number, totalItems: number): number {
  if (totalItems === 0) return 0;
  return Math.round((packedItems / totalItems) * 100);
}
