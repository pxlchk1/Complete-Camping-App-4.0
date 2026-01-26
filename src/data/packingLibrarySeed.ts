/**
 * Packing Library Seed Data
 * Pre-populated categories and items for the global packing library
 * This data should be seeded to Firestore on app deployment
 */

import { PackingLibraryCategory, PackingLibraryItem, PackingItemTags } from "../types/packingLibrary";

// ============================================================================
// CATEGORIES
// ============================================================================

export const PACKING_LIBRARY_CATEGORIES: PackingLibraryCategory[] = [
  { id: "shelter", label: "Shelter", order: 1, icon: "home-outline" },
  { id: "sleep_system", label: "Sleep System", order: 2, icon: "bed-outline" },
  { id: "water", label: "Water", order: 3, icon: "water-outline" },
  { id: "kitchen", label: "Kitchen", order: 4, icon: "restaurant-outline" },
  { id: "food", label: "Food", order: 5, icon: "fast-food-outline" },
  { id: "clothing", label: "Clothing", order: 6, icon: "shirt-outline" },
  { id: "layers_and_warmth", label: "Layers & Warmth", order: 7, icon: "snow-outline" },
  { id: "rain_and_weather", label: "Rain & Weather", order: 8, icon: "rainy-outline" },
  { id: "footwear", label: "Footwear", order: 9, icon: "footsteps-outline" },
  { id: "hygiene", label: "Hygiene", order: 10, icon: "sparkles-outline" },
  { id: "first_aid", label: "First Aid", order: 11, icon: "medkit-outline" },
  { id: "navigation_and_safety", label: "Navigation & Safety", order: 12, icon: "compass-outline" },
  { id: "tools", label: "Tools", order: 13, icon: "construct-outline" },
  { id: "personal_items", label: "Personal Items", order: 14, icon: "person-outline" },
  { id: "electronics", label: "Electronics", order: 15, icon: "battery-charging-outline" },
  { id: "trip_specific", label: "Trip Specific", order: 16, icon: "flag-outline" },
];

// Helper to create base tags (always included)
const baseTags = (styles: PackingItemTags["styles"] = ["any"]): PackingItemTags => ({
  seasons: ["any"],
  temps: ["any"],
  wind: ["any"],
  precip: ["any"],
  styles,
  base: true,
});

// Helper for winter-specific tags
const winterTags = (styles: PackingItemTags["styles"] = ["any"]): PackingItemTags => ({
  seasons: ["winter"],
  temps: ["below_freezing", "cold"],
  wind: ["any"],
  precip: ["any"],
  styles,
});

// Helper for cold weather tags (includes shoulder season)
const coldTags = (styles: PackingItemTags["styles"] = ["any"]): PackingItemTags => ({
  seasons: ["winter", "shoulder"],
  temps: ["below_freezing", "cold"],
  wind: ["any"],
  precip: ["any"],
  styles,
});

// Helper for rain tags
const rainTags = (styles: PackingItemTags["styles"] = ["any"]): PackingItemTags => ({
  seasons: ["any"],
  temps: ["any"],
  wind: ["any"],
  precip: ["rain"],
  styles,
});

// Helper for snow tags
const snowTags = (styles: PackingItemTags["styles"] = ["any"]): PackingItemTags => ({
  seasons: ["winter"],
  temps: ["below_freezing"],
  wind: ["any"],
  precip: ["snow"],
  styles,
});

// Helper for hot weather tags
const hotTags = (styles: PackingItemTags["styles"] = ["any"]): PackingItemTags => ({
  seasons: ["summer"],
  temps: ["hot", "mild"],
  wind: ["any"],
  precip: ["any"],
  styles,
});

// Helper for windy conditions
const windyTags = (styles: PackingItemTags["styles"] = ["any"]): PackingItemTags => ({
  seasons: ["any"],
  temps: ["any"],
  wind: ["windy"],
  precip: ["any"],
  styles,
});

// ============================================================================
// LIBRARY ITEMS
// ============================================================================

let itemIdCounter = 1;
const createItem = (
  name: string,
  categoryId: string,
  priority: number,
  tags: PackingItemTags,
  options?: { defaultQty?: number; notes?: string }
): PackingLibraryItem => ({
  id: `lib_item_${itemIdCounter++}`,
  name,
  categoryId,
  priority,
  defaultQty: options?.defaultQty ?? 1,
  notes: options?.notes,
  tags,
});

export const PACKING_LIBRARY_ITEMS: PackingLibraryItem[] = [
  // ============================================================================
  // SHELTER - Base items
  // ============================================================================
  createItem("Tent", "shelter", 5, baseTags(["car_camping", "backpacking"])),
  createItem("Tent stakes", "shelter", 4, baseTags(["car_camping", "backpacking"]), { defaultQty: 8 }),
  createItem("Rain fly", "shelter", 4, baseTags(["car_camping", "backpacking"])),
  createItem("Ground tarp / footprint", "shelter", 3, baseTags(["car_camping", "backpacking"])),
  createItem("Tent repair kit", "shelter", 2, baseTags(["backpacking"])),

  // Shelter - Winter/Wind specific
  createItem("4-season tent", "shelter", 5, winterTags(["backpacking", "car_camping"]), { notes: "Required for winter camping" }),
  createItem("Snow stakes or deadman anchors", "shelter", 3, snowTags(["backpacking", "car_camping"])),
  createItem("Extra guylines", "shelter", 3, windyTags()),
  createItem("Windbreak / tarp", "shelter", 3, windyTags(["car_camping"])),

  // ============================================================================
  // SLEEP SYSTEM - Base items
  // ============================================================================
  createItem("Sleeping bag", "sleep_system", 5, baseTags()),
  createItem("Sleeping pad", "sleep_system", 5, baseTags()),
  createItem("Pillow", "sleep_system", 2, baseTags(["car_camping"])),

  // Sleep - Winter specific
  createItem("Cold-weather sleeping bag (0-20°F)", "sleep_system", 5, winterTags(), { notes: "Critical for winter camping" }),
  createItem("Insulated sleeping pad (R4+)", "sleep_system", 5, winterTags(), { notes: "R-value of 4+ for winter" }),
  createItem("Backup foam pad", "sleep_system", 3, winterTags(["backpacking"])),
  createItem("Sleeping bag liner", "sleep_system", 3, coldTags(), { notes: "Adds 10-15°F warmth" }),
  createItem("Hot water bottle", "sleep_system", 2, winterTags(), { notes: "Fill with hot water before bed" }),

  // ============================================================================
  // WATER - Base items
  // ============================================================================
  createItem("Water bottles", "water", 5, baseTags(), { defaultQty: 2 }),
  createItem("Water filter", "water", 4, baseTags(["backpacking"])),
  createItem("Water purification tablets", "water", 3, baseTags(["backpacking"])),

  // Water - Winter specific
  createItem("Insulated water bottle sleeve", "water", 3, winterTags(), { notes: "Prevents freezing" }),
  createItem("Wide-mouth water bottles", "water", 3, winterTags(), { notes: "Less likely to freeze shut" }),

  // ============================================================================
  // KITCHEN - Base items
  // ============================================================================
  createItem("Camp stove", "kitchen", 4, baseTags()),
  createItem("Fuel", "kitchen", 4, baseTags()),
  createItem("Lighter", "kitchen", 5, baseTags()),
  createItem("Backup fire starter", "kitchen", 3, baseTags()),
  createItem("Cookware / pot", "kitchen", 4, baseTags()),
  createItem("Utensils / spork", "kitchen", 4, baseTags()),
  createItem("Plates / bowls", "kitchen", 3, baseTags(["car_camping"])),
  createItem("Cooler", "kitchen", 4, baseTags(["car_camping", "rv"])),
  createItem("Trash bags", "kitchen", 4, baseTags(), { defaultQty: 3 }),
  createItem("Dish soap", "kitchen", 2, baseTags(["car_camping"])),
  createItem("Sponge", "kitchen", 2, baseTags(["car_camping"])),

  // Kitchen - Winter specific
  createItem("Insulated mug", "kitchen", 3, winterTags(), { notes: "Keeps drinks hot" }),
  createItem("Thermos", "kitchen", 3, winterTags(), { notes: "For hot drinks on the trail" }),
  createItem("Windscreen for stove", "kitchen", 4, windyTags(), { notes: "Essential in windy conditions" }),
  createItem("Cold-weather fuel", "kitchen", 4, winterTags(["backpacking"]), { notes: "Isobutane struggles below 20°F" }),

  // ============================================================================
  // FOOD - Base items
  // ============================================================================
  createItem("Breakfasts", "food", 4, baseTags(), { notes: "Plan per number of nights + 1" }),
  createItem("Lunches / trail food", "food", 4, baseTags()),
  createItem("Dinners", "food", 4, baseTags(), { notes: "Plan per number of nights" }),
  createItem("Snacks", "food", 3, baseTags()),
  createItem("Coffee / tea", "food", 2, baseTags()),

  // Food - Winter specific
  createItem("High-calorie snacks", "food", 4, winterTags(), { notes: "Body burns more calories in cold" }),
  createItem("Hot drink packets", "food", 3, winterTags(), { notes: "Hot cocoa, cider, tea" }),
  createItem("Extra food rations", "food", 3, winterTags(), { notes: "Plan extra for cold weather" }),

  // Food - Summer specific
  createItem("Electrolyte powder", "food", 3, hotTags(), { notes: "Prevent dehydration" }),

  // ============================================================================
  // CLOTHING - Base items
  // ============================================================================
  createItem("Hiking pants", "clothing", 4, baseTags()),
  createItem("Hiking shorts", "clothing", 3, hotTags()),
  createItem("T-shirts / hiking shirts", "clothing", 4, baseTags(), { defaultQty: 2 }),
  createItem("Underwear", "clothing", 4, baseTags(), { defaultQty: 3 }),
  createItem("Socks", "clothing", 4, baseTags(), { defaultQty: 3 }),
  createItem("Sleepwear", "clothing", 2, baseTags()),

  // ============================================================================
  // LAYERS & WARMTH - Winter/Cold specific
  // ============================================================================
  createItem("Base layer top (wool or synthetic)", "layers_and_warmth", 5, coldTags(), { notes: "Moisture-wicking, never cotton" }),
  createItem("Base layer bottom", "layers_and_warmth", 5, coldTags()),
  createItem("Mid layer / fleece", "layers_and_warmth", 4, coldTags()),
  createItem("Insulated jacket (down or synthetic)", "layers_and_warmth", 5, winterTags(), { notes: "Your main warmth layer" }),
  createItem("Puffy vest", "layers_and_warmth", 3, coldTags()),
  createItem("Warm hat / beanie", "layers_and_warmth", 5, winterTags(), { notes: "Lose 40% of heat through head" }),
  createItem("Gloves", "layers_and_warmth", 4, coldTags()),
  createItem("Liner gloves", "layers_and_warmth", 3, winterTags(), { notes: "For camp tasks in cold" }),
  createItem("Insulated gloves / mittens", "layers_and_warmth", 4, winterTags(), { notes: "Mittens are warmer than gloves" }),
  createItem("Neck gaiter / buff", "layers_and_warmth", 4, coldTags()),
  createItem("Balaclava", "layers_and_warmth", 3, winterTags(), { notes: "Full face protection in extreme cold" }),
  createItem("Hand warmers", "layers_and_warmth", 2, winterTags(), { defaultQty: 4 }),
  createItem("Toe warmers", "layers_and_warmth", 2, winterTags(), { defaultQty: 2 }),
  createItem("Extra wool socks", "layers_and_warmth", 4, winterTags(), { defaultQty: 2, notes: "Keep dry socks for sleeping" }),

  // ============================================================================
  // RAIN & WEATHER
  // ============================================================================
  createItem("Rain jacket", "rain_and_weather", 4, rainTags()),
  createItem("Rain pants", "rain_and_weather", 3, rainTags()),
  createItem("Pack cover", "rain_and_weather", 3, rainTags(["backpacking"])),
  createItem("Dry bags", "rain_and_weather", 3, rainTags(), { defaultQty: 2 }),
  createItem("Waterproof pack liner", "rain_and_weather", 3, rainTags(["backpacking"])),
  createItem("Extra tarp", "rain_and_weather", 2, rainTags(["car_camping"])),

  // Wind specific
  createItem("Windproof jacket", "rain_and_weather", 4, windyTags()),

  // ============================================================================
  // FOOTWEAR
  // ============================================================================
  createItem("Hiking boots", "footwear", 5, baseTags()),
  createItem("Camp shoes / sandals", "footwear", 2, baseTags(["car_camping"])),

  // Winter footwear
  createItem("Insulated boots", "footwear", 5, winterTags(), { notes: "Rated for expected temperatures" }),
  createItem("Gaiters", "footwear", 4, snowTags(), { notes: "Keep snow out of boots" }),
  createItem("Boot dryers / extra insoles", "footwear", 2, winterTags()),

  // ============================================================================
  // HYGIENE - Base items
  // ============================================================================
  createItem("Toothbrush", "hygiene", 4, baseTags()),
  createItem("Toothpaste", "hygiene", 4, baseTags()),
  createItem("Toilet paper", "hygiene", 4, baseTags()),
  createItem("Hand sanitizer", "hygiene", 4, baseTags()),
  createItem("Trowel", "hygiene", 3, baseTags(["backpacking"])),
  createItem("Waste bags", "hygiene", 3, baseTags(["backpacking"])),
  createItem("Biodegradable soap", "hygiene", 2, baseTags()),
  createItem("Towel", "hygiene", 2, baseTags()),

  // ============================================================================
  // FIRST AID - Base items
  // ============================================================================
  createItem("First aid kit", "first_aid", 5, baseTags()),
  createItem("Blister care / moleskin", "first_aid", 4, baseTags(["backpacking"])),
  createItem("Personal medications", "first_aid", 5, baseTags()),
  createItem("Sunscreen", "first_aid", 3, hotTags()),
  createItem("Lip balm with SPF", "first_aid", 3, baseTags()),
  createItem("Bug spray", "first_aid", 3, hotTags()),

  // Winter first aid
  createItem("Hand/skin repair cream", "first_aid", 3, winterTags(), { notes: "For cracked/dry skin" }),

  // ============================================================================
  // NAVIGATION & SAFETY - Base items
  // ============================================================================
  createItem("Headlamp", "navigation_and_safety", 5, baseTags()),
  createItem("Extra batteries", "navigation_and_safety", 4, baseTags()),
  createItem("Backup light source", "navigation_and_safety", 3, baseTags()),
  createItem("Map / offline maps", "navigation_and_safety", 4, baseTags(["backpacking"])),
  createItem("Compass", "navigation_and_safety", 3, baseTags(["backpacking"])),
  createItem("Whistle", "navigation_and_safety", 4, baseTags()),
  createItem("Emergency blanket", "navigation_and_safety", 3, baseTags()),

  // Winter safety
  createItem("Extra batteries (cold drains faster)", "navigation_and_safety", 4, winterTags(), { notes: "Keep warm in pocket" }),

  // ============================================================================
  // TOOLS - Base items
  // ============================================================================
  createItem("Multi-tool / knife", "tools", 4, baseTags()),
  createItem("Duct tape", "tools", 3, baseTags()),
  createItem("Rope / paracord", "tools", 3, baseTags()),
  createItem("Trekking poles", "tools", 3, baseTags(["backpacking"])),

  // ============================================================================
  // PERSONAL ITEMS - Base items
  // ============================================================================
  createItem("ID / wallet", "personal_items", 5, baseTags()),
  createItem("Phone", "personal_items", 4, baseTags()),
  createItem("Cash", "personal_items", 2, baseTags()),
  createItem("Campsite reservation", "personal_items", 4, baseTags()),
  createItem("Sunglasses", "personal_items", 3, baseTags()),

  // ============================================================================
  // ELECTRONICS
  // ============================================================================
  createItem("Phone charger", "electronics", 3, baseTags()),
  createItem("Portable battery pack", "electronics", 3, baseTags()),
  createItem("Camera", "electronics", 2, baseTags()),

  // Winter electronics
  createItem("Extra power bank", "electronics", 3, winterTags(), { notes: "Cold drains batteries faster" }),

  // ============================================================================
  // CAR CAMPING SPECIFIC
  // ============================================================================
  createItem("Camp chairs", "trip_specific", 3, baseTags(["car_camping"]), { defaultQty: 2 }),
  createItem("Camp table", "trip_specific", 2, baseTags(["car_camping"])),
  createItem("Lantern", "trip_specific", 3, baseTags(["car_camping"])),
  createItem("Firewood / fire starter", "trip_specific", 2, baseTags(["car_camping"])),

  // ============================================================================
  // BACKPACKING SPECIFIC
  // ============================================================================
  createItem("Backpack", "trip_specific", 5, baseTags(["backpacking"])),
  createItem("Bear canister / bag", "trip_specific", 4, baseTags(["backpacking"]), { notes: "Required in many areas" }),
  createItem("Permit", "trip_specific", 5, baseTags(["backpacking"]), { notes: "Check if required" }),
];

/**
 * Get category by ID
 */
export function getCategoryById(categoryId: string): PackingLibraryCategory | undefined {
  return PACKING_LIBRARY_CATEGORIES.find(c => c.id === categoryId);
}

/**
 * Get category label by ID
 */
export function getCategoryLabel(categoryId: string): string {
  const category = getCategoryById(categoryId);
  return category?.label ?? categoryId;
}

/**
 * Get all base items (items that should always be included)
 */
export function getBaseItems(campingStyle?: string): PackingLibraryItem[] {
  return PACKING_LIBRARY_ITEMS.filter(item => {
    if (!item.tags.base) return false;
    
    // Check if item applies to the camping style
    if (item.tags.styles.includes("any")) return true;
    if (!campingStyle) return true;
    
    const normalizedStyle = campingStyle.toLowerCase().replace(/[_\s-]/g, "_");
    return item.tags.styles.some(s => s === normalizedStyle || s === "any");
  });
}

/**
 * Get suggested items based on trip context
 */
export function getSuggestedItems(context: {
  season: string;
  tempBand: string;
  windy: boolean;
  precip: string;
  style: string;
}): PackingLibraryItem[] {
  return PACKING_LIBRARY_ITEMS.filter(item => {
    // Skip base items (they're already included)
    if (item.tags.base) return false;
    
    let matches = false;

    // Check season match
    if (item.tags.seasons.includes(context.season as any) || item.tags.seasons.includes("any")) {
      if (context.season === "winter" && item.tags.seasons.includes("winter")) {
        matches = true;
      }
    }

    // Check temperature match
    if (item.tags.temps.includes(context.tempBand as any)) {
      matches = true;
    }

    // Check wind match
    if (context.windy && item.tags.wind.includes("windy")) {
      matches = true;
    }

    // Check precipitation match
    if (context.precip !== "none" && item.tags.precip.includes(context.precip as any)) {
      matches = true;
    }

    // Must also match camping style
    if (matches) {
      const styleMatches = item.tags.styles.includes("any") || 
        item.tags.styles.includes(context.style as any);
      if (!styleMatches) matches = false;
    }

    return matches;
  });
}
