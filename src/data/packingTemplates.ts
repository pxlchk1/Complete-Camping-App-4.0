/**
 * Packing Templates Seed Data
 * Pre-populated templates for different camping styles and seasons
 */

import {
  PackingTemplate,
  PackingTemplateItem,
  PackingCategory,
  TripType,
  Season,
  GearGroup,
  GearVariant,
} from "../types/packingV2";

// ============================================================================
// TEMPLATE DEFINITIONS
// ============================================================================

interface TemplateDefinition {
  template: Omit<PackingTemplate, "id" | "createdAt" | "updatedAt" | "itemCount">;
  items: Omit<PackingTemplateItem, "id" | "templateId">[];
}

// Helper to create template items
function item(
  name: string,
  category: PackingCategory,
  isEssential: boolean,
  options?: {
    quantity?: number;
    notes?: string;
    gearGroup?: GearGroup;
    variant?: GearVariant;
    gearClosetEligible?: boolean;
  }
): Omit<PackingTemplateItem, "id" | "templateId"> {
  return {
    name,
    category,
    isEssential,
    quantity: options?.quantity ?? 1,
    notes: options?.notes,
    gearGroup: options?.gearGroup,
    variant: options?.variant,
    gearClosetEligible: options?.gearClosetEligible ?? false,
  };
}

// ============================================================================
// BACKPACKING TEMPLATES
// ============================================================================

const winterBackpacking: TemplateDefinition = {
  template: {
    name: "Winter Backpacking",
    description: "Essential gear for cold-weather backcountry trips",
    isSystem: true,
    tripTypes: ["backpacking", "winter_camping"],
    seasons: ["winter"],
    defaultNights: 2,
    tags: ["backpacking", "winter", "cold"],
    useCount: 0,
  },
  items: [
    // Shelter
    item("4-season tent", "shelter", true, { gearGroup: "shelterPrimary", variant: "4season", gearClosetEligible: true }),
    item("Groundsheet / footprint", "shelter", true, { gearClosetEligible: true }),
    item("Stakes", "shelter", true, { gearClosetEligible: true }),
    item("Guylines", "shelter", true),
    item("Snow stakes or deadman anchors", "shelter", false),
    item("Tent repair sleeve", "shelter", true),

    // Sleep
    item("Sleeping bag (0–20°F)", "sleep", true, { gearGroup: "sleepPrimary", variant: "cold", gearClosetEligible: true }),
    item("Sleeping pad (R4+ insulated)", "sleep", true, { gearGroup: "padPrimary", variant: "insulated", gearClosetEligible: true }),
    item("Backup foam pad", "sleep", false),
    item("Compact pillow", "sleep", false, { gearClosetEligible: true }),

    // Water
    item("Water bottles or bladder", "water", true, { quantity: 2, gearClosetEligible: true }),
    item("Water filter", "water", true, { gearClosetEligible: true }),
    item("Backup purification tablets", "water", true),
    item("Insulated bottle sleeve", "water", false),

    // Kitchen
    item("Backpacking stove", "kitchen", true, { gearClosetEligible: true }),
    item("Fuel canister", "kitchen", true),
    item("Lighter + backup fire starter", "kitchen", true),
    item("Pot", "kitchen", true, { gearClosetEligible: true }),
    item("Spoon / spork", "kitchen", true),
    item("Insulated mug", "kitchen", false, { gearClosetEligible: true }),
    item("Wind screen", "kitchen", false),
    item("Small sponge", "kitchen", false),
    item("Trash bag", "kitchen", true),

    // Food
    item("Dinners", "food", true, { quantity: 2 }),
    item("Breakfasts", "food", true, { quantity: 2 }),
    item("Trail lunches", "food", true, { quantity: 2 }),
    item("Snacks", "food", true),
    item("Electrolytes", "food", false),
    item("Hot drink packets", "food", false),

    // Clothing
    item("Base layer top", "clothing", true),
    item("Base layer bottom", "clothing", true),
    item("Hiking pants", "clothing", true),
    item("Hiking shirt / mid layer", "clothing", true),
    item("Underwear", "clothing", true, { quantity: 3 }),
    item("Wool socks", "clothing", true, { quantity: 3 }),

    // Layers & Warmth
    item("Insulating jacket (down or synthetic)", "layers_warmth", true, { gearClosetEligible: true }),
    item("Fleece or mid layer", "layers_warmth", true),
    item("Warm hat / beanie", "layers_warmth", true),
    item("Gloves + liner gloves", "layers_warmth", true),
    item("Neck gaiter / buff", "layers_warmth", true),
    item("Hand warmers", "layers_warmth", false),

    // Rain & Weather
    item("Rain jacket", "rain_weather", true, { gearClosetEligible: true }),
    item("Rain pants", "rain_weather", false),
    item("Pack cover or pack liner", "rain_weather", true),

    // Footwear
    item("Hiking boots", "footwear", true, { gearClosetEligible: true }),
    item("Camp shoes", "footwear", false),
    item("Gaiters", "footwear", false),

    // Hygiene
    item("Toothbrush", "hygiene", true),
    item("Toothpaste", "hygiene", true),
    item("Wipes", "hygiene", false),
    item("Hand sanitizer", "hygiene", true),
    item("Trowel", "hygiene", true),
    item("Toilet paper", "hygiene", true),
    item("Waste bags", "hygiene", true),

    // First Aid
    item("First aid kit", "first_aid", true, { gearClosetEligible: true }),
    item("Blister care", "first_aid", true),
    item("Personal medications", "first_aid", true),

    // Navigation & Safety
    item("Headlamp", "navigation_safety", true, { gearClosetEligible: true }),
    item("Backup light", "navigation_safety", false),
    item("Map or offline maps", "navigation_safety", true),
    item("Compass", "navigation_safety", false, { gearClosetEligible: true }),
    item("Whistle", "navigation_safety", true),
    item("Emergency blanket / bivy", "navigation_safety", true),
    item("Bear spray", "navigation_safety", false, { notes: "If in bear country" }),
    item("Bear hang kit or canister", "navigation_safety", true, { notes: "Region dependent" }),

    // Lighting
    item("Headlamp batteries", "lighting", true, { quantity: 2 }),
    item("Small lantern", "lighting", false),

    // Tools & Repairs
    item("Knife or multi-tool", "tools_repairs", true, { gearClosetEligible: true }),
    item("Duct tape or gear tape", "tools_repairs", true),
    item("Zip ties", "tools_repairs", false),
    item("Trekking poles", "tools_repairs", false, { gearClosetEligible: true }),

    // Electronics
    item("Phone", "electronics", true),
    item("Power bank", "electronics", false),
    item("Charging cable", "electronics", false),

    // Documents & Essentials
    item("ID", "documents_essentials", true),
    item("Park permits", "documents_essentials", true),
    item("Payment card / cash", "documents_essentials", false),

    // Optional Extras
    item("Microspikes", "optional_extras", false, { gearClosetEligible: true }),
    item("Small snow shovel", "optional_extras", false),
    item("Sit pad", "optional_extras", false),
  ],
};

const summerBackpacking: TemplateDefinition = {
  template: {
    name: "Summer Backpacking",
    description: "Lightweight gear for warm-weather trail adventures",
    isSystem: true,
    tripTypes: ["backpacking"],
    seasons: ["summer"],
    defaultNights: 2,
    tags: ["backpacking", "summer", "warm", "lightweight"],
    useCount: 0,
  },
  items: [
    // Shelter
    item("3-season tent", "shelter", true, { gearGroup: "shelterPrimary", variant: "3season", gearClosetEligible: true }),
    item("Groundsheet / footprint", "shelter", false, { gearClosetEligible: true }),
    item("Stakes", "shelter", true, { gearClosetEligible: true }),
    item("Bug net (if tarp)", "shelter", false),

    // Sleep
    item("Sleeping bag (30–50°F)", "sleep", true, { gearGroup: "sleepPrimary", variant: "warm", gearClosetEligible: true }),
    item("Sleeping pad", "sleep", true, { gearGroup: "padPrimary", variant: "standard", gearClosetEligible: true }),
    item("Compact pillow", "sleep", false, { gearClosetEligible: true }),

    // Water
    item("Water bottles or bladder", "water", true, { quantity: 2, gearClosetEligible: true }),
    item("Water filter", "water", true, { gearClosetEligible: true }),
    item("Electrolyte tablets", "water", false),

    // Kitchen
    item("Backpacking stove", "kitchen", true, { gearClosetEligible: true }),
    item("Fuel canister", "kitchen", true),
    item("Lighter", "kitchen", true),
    item("Pot", "kitchen", true, { gearClosetEligible: true }),
    item("Spoon / spork", "kitchen", true),
    item("Trash bag", "kitchen", true),

    // Food
    item("Dinners", "food", true, { quantity: 2 }),
    item("Breakfasts", "food", true, { quantity: 2 }),
    item("Trail lunches", "food", true, { quantity: 2 }),
    item("Snacks", "food", true),

    // Clothing
    item("Hiking shirt", "clothing", true),
    item("Hiking shorts or pants", "clothing", true),
    item("Underwear", "clothing", true, { quantity: 3 }),
    item("Hiking socks", "clothing", true, { quantity: 2 }),
    item("Sleep clothes", "clothing", false),

    // Layers & Warmth
    item("Light fleece or puffy", "layers_warmth", false, { gearClosetEligible: true }),
    item("Sun hat", "layers_warmth", true),

    // Rain & Weather
    item("Lightweight rain jacket", "rain_weather", true, { gearClosetEligible: true }),
    item("Pack cover or liner", "rain_weather", true),
    item("Sunscreen", "rain_weather", true),
    item("Bug spray", "rain_weather", true),
    item("Sunglasses", "rain_weather", true),

    // Footwear
    item("Trail runners or hiking boots", "footwear", true, { gearClosetEligible: true }),
    item("Camp sandals", "footwear", false),

    // Hygiene
    item("Toothbrush", "hygiene", true),
    item("Toothpaste", "hygiene", true),
    item("Hand sanitizer", "hygiene", true),
    item("Trowel", "hygiene", true),
    item("Toilet paper", "hygiene", true),

    // First Aid
    item("First aid kit", "first_aid", true, { gearClosetEligible: true }),
    item("Blister care", "first_aid", true),
    item("Personal medications", "first_aid", true),

    // Navigation & Safety
    item("Headlamp", "navigation_safety", true, { gearClosetEligible: true }),
    item("Map or offline maps", "navigation_safety", true),
    item("Whistle", "navigation_safety", true),
    item("Bear hang kit or canister", "navigation_safety", true, { notes: "Region dependent" }),

    // Tools & Repairs
    item("Knife or multi-tool", "tools_repairs", true, { gearClosetEligible: true }),
    item("Duct tape strip", "tools_repairs", true),
    item("Trekking poles", "tools_repairs", false, { gearClosetEligible: true }),

    // Electronics
    item("Phone", "electronics", true),
    item("Power bank", "electronics", false),

    // Documents & Essentials
    item("ID", "documents_essentials", true),
    item("Park permits", "documents_essentials", true),
  ],
};

// ============================================================================
// CAR CAMPING TEMPLATES
// ============================================================================

const summerCarCamping: TemplateDefinition = {
  template: {
    name: "Summer Car Camping",
    description: "Everything you need for a comfortable summer campground weekend",
    isSystem: true,
    tripTypes: ["car_camping", "family_camping"],
    seasons: ["summer"],
    defaultNights: 2,
    tags: ["car camping", "summer", "family friendly"],
    useCount: 0,
  },
  items: [
    // Shelter
    item("Tent", "shelter", true, { gearGroup: "shelterPrimary", variant: "3season", gearClosetEligible: true }),
    item("Stakes", "shelter", true, { gearClosetEligible: true }),
    item("Mallet", "shelter", false),
    item("Footprint / ground tarp", "shelter", false, { gearClosetEligible: true }),
    item("Shade canopy", "shelter", false, { gearClosetEligible: true }),

    // Sleep
    item("Sleeping bag", "sleep", true, { gearGroup: "sleepPrimary", variant: "warm", gearClosetEligible: true }),
    item("Sleeping pad or air mattress", "sleep", true, { gearClosetEligible: true }),
    item("Pillow", "sleep", true),
    item("Extra blanket", "sleep", false),

    // Kitchen
    item("Camp stove", "kitchen", true, { gearClosetEligible: true }),
    item("Fuel", "kitchen", true),
    item("Cooler", "kitchen", true, { gearClosetEligible: true }),
    item("Ice", "kitchen", true),
    item("Pots and pans", "kitchen", true, { gearClosetEligible: true }),
    item("Cooking utensils", "kitchen", true),
    item("Plates and bowls", "kitchen", true),
    item("Cups / mugs", "kitchen", true),
    item("Cutting board", "kitchen", false),
    item("Camp knife", "kitchen", true),
    item("Lighter and matches", "kitchen", true),
    item("Trash bags", "kitchen", true),
    item("Paper towels", "kitchen", true),
    item("Dish soap and sponge", "kitchen", true),
    item("Wash bin", "kitchen", false),

    // Water
    item("Water jug (5 gallon)", "water", true, { gearClosetEligible: true }),
    item("Refillable water bottles", "water", false),

    // Food
    item("Meal ingredients", "food", true, { notes: "Plan meals ahead" }),
    item("Snacks", "food", true),
    item("Coffee / tea", "food", false),
    item("Condiments", "food", false),

    // Clothing
    item("Weather-appropriate outfits", "clothing", true),
    item("Socks and underwear", "clothing", true),
    item("Sleepwear", "clothing", false),
    item("Swimsuit", "clothing", false),

    // Rain & Weather
    item("Rain jacket", "rain_weather", false, { gearClosetEligible: true }),
    item("Warm layer for evenings", "rain_weather", true),
    item("Sun hat", "rain_weather", false),
    item("Sunscreen", "rain_weather", true),
    item("Bug spray", "rain_weather", true),

    // Footwear
    item("Comfortable walking shoes", "footwear", true),
    item("Sandals or flip flops", "footwear", false),

    // Hygiene
    item("Toiletry kit", "hygiene", true),
    item("Towel", "hygiene", false),
    item("Hand sanitizer", "hygiene", true),
    item("Wipes", "hygiene", false),

    // First Aid
    item("First aid kit", "first_aid", true, { gearClosetEligible: true }),
    item("Bug bite relief", "first_aid", false),
    item("Personal medications", "first_aid", true),

    // Navigation & Safety
    item("Headlamp / flashlight", "navigation_safety", true, { gearClosetEligible: true }),
    item("Lantern", "navigation_safety", false, { gearClosetEligible: true }),
    item("Fire starter", "navigation_safety", true),

    // Camp Comfort
    item("Camp chairs", "camp_comfort", true, { gearClosetEligible: true }),
    item("Camp table", "camp_comfort", false, { gearClosetEligible: true }),
    item("Hammock", "camp_comfort", false, { gearClosetEligible: true }),
    item("Games or cards", "camp_comfort", false),

    // Tools & Repairs
    item("Multi-tool", "tools_repairs", false, { gearClosetEligible: true }),
    item("Extra cord / rope", "tools_repairs", false),

    // Electronics
    item("Phone charger (car)", "electronics", true),
    item("Power bank", "electronics", false),
    item("Bluetooth speaker", "electronics", false),

    // Documents & Essentials
    item("Reservation confirmation", "documents_essentials", true),
    item("ID", "documents_essentials", true),
  ],
};

const fallCarCamping: TemplateDefinition = {
  template: {
    name: "Fall Car Camping",
    description: "Cozy camping with extra layers for crisp autumn nights",
    isSystem: true,
    tripTypes: ["car_camping", "family_camping"],
    seasons: ["fall"],
    defaultNights: 2,
    tags: ["car camping", "fall", "mild"],
    useCount: 0,
  },
  items: [
    // Shelter - same as summer
    item("Tent", "shelter", true, { gearGroup: "shelterPrimary", variant: "3season", gearClosetEligible: true }),
    item("Stakes", "shelter", true, { gearClosetEligible: true }),
    item("Rain tarp", "shelter", false),
    item("Footprint", "shelter", false, { gearClosetEligible: true }),

    // Sleep
    item("Sleeping bag (20–40°F)", "sleep", true, { gearGroup: "sleepPrimary", variant: "mid", gearClosetEligible: true }),
    item("Sleeping pad or air mattress", "sleep", true, { gearClosetEligible: true }),
    item("Pillow", "sleep", true),
    item("Extra blanket", "sleep", true),

    // Kitchen - same as summer
    item("Camp stove", "kitchen", true, { gearClosetEligible: true }),
    item("Fuel", "kitchen", true),
    item("Cooler", "kitchen", true, { gearClosetEligible: true }),
    item("Ice", "kitchen", true),
    item("Pots and pans", "kitchen", true, { gearClosetEligible: true }),
    item("Cooking utensils", "kitchen", true),
    item("Plates and bowls", "kitchen", true),
    item("Cups / mugs", "kitchen", true),
    item("Camp knife", "kitchen", true),
    item("Lighter and matches", "kitchen", true),
    item("Trash bags", "kitchen", true),
    item("Paper towels", "kitchen", true),
    item("Dish soap and sponge", "kitchen", true),

    // Water
    item("Water jug", "water", true, { gearClosetEligible: true }),

    // Food
    item("Meal ingredients", "food", true),
    item("Snacks", "food", true),
    item("Coffee / tea", "food", false),
    item("Hot cocoa", "food", false),

    // Clothing
    item("Weather-appropriate outfits", "clothing", true),
    item("Socks and underwear", "clothing", true),
    item("Long pants", "clothing", true),
    item("Long sleeve shirts", "clothing", true),

    // Layers & Warmth
    item("Warm jacket", "layers_warmth", true, { gearClosetEligible: true }),
    item("Beanie / warm hat", "layers_warmth", true),
    item("Gloves", "layers_warmth", false),
    item("Fleece or hoodie", "layers_warmth", true),

    // Rain & Weather
    item("Rain jacket", "rain_weather", true, { gearClosetEligible: true }),
    item("Rain pants", "rain_weather", false),

    // Footwear
    item("Waterproof boots or shoes", "footwear", true),
    item("Camp shoes", "footwear", false),

    // Hygiene
    item("Toiletry kit", "hygiene", true),
    item("Towel", "hygiene", false),
    item("Hand sanitizer", "hygiene", true),

    // First Aid
    item("First aid kit", "first_aid", true, { gearClosetEligible: true }),
    item("Personal medications", "first_aid", true),

    // Navigation & Safety
    item("Headlamp / flashlight", "navigation_safety", true, { gearClosetEligible: true }),
    item("Lantern", "navigation_safety", false, { gearClosetEligible: true }),
    item("Fire starter", "navigation_safety", true),

    // Camp Comfort
    item("Camp chairs", "camp_comfort", true, { gearClosetEligible: true }),
    item("Camp table", "camp_comfort", false, { gearClosetEligible: true }),

    // Electronics
    item("Phone charger", "electronics", true),

    // Documents & Essentials
    item("Reservation confirmation", "documents_essentials", true),
    item("ID", "documents_essentials", true),
  ],
};

const winterCarCamping: TemplateDefinition = {
  template: {
    name: "Winter Car Camping",
    description: "Stay warm and comfortable in cold-weather campground camping",
    isSystem: true,
    tripTypes: ["car_camping", "winter_camping"],
    seasons: ["winter"],
    defaultNights: 2,
    tags: ["car camping", "winter", "cold"],
    useCount: 0,
  },
  items: [
    // Shelter
    item("Winter-rated tent or hot tent", "shelter", true, { gearGroup: "shelterPrimary", variant: "4season", gearClosetEligible: true }),
    item("Stakes", "shelter", true, { gearClosetEligible: true }),
    item("Snow stakes", "shelter", false),
    item("Ground tarp", "shelter", true),

    // Sleep
    item("Sleeping bag (0–20°F)", "sleep", true, { gearGroup: "sleepPrimary", variant: "cold", gearClosetEligible: true }),
    item("Insulated sleeping pad", "sleep", true, { gearGroup: "padPrimary", variant: "insulated", gearClosetEligible: true }),
    item("Pillow", "sleep", true),
    item("Extra blankets", "sleep", true, { quantity: 2 }),

    // Kitchen
    item("Camp stove", "kitchen", true, { gearClosetEligible: true }),
    item("Extra fuel", "kitchen", true, { quantity: 2 }),
    item("Cooler (for keeping things from freezing)", "kitchen", false, { gearClosetEligible: true }),
    item("Thermos", "kitchen", false),
    item("Pots and pans", "kitchen", true, { gearClosetEligible: true }),
    item("Cooking utensils", "kitchen", true),
    item("Insulated mugs", "kitchen", true),
    item("Lighter and matches", "kitchen", true),
    item("Trash bags", "kitchen", true),

    // Water
    item("Water jugs", "water", true, { notes: "Keep from freezing" }),

    // Food
    item("Warm meals", "food", true),
    item("Hot drinks", "food", true),
    item("High-calorie snacks", "food", true),

    // Clothing
    item("Base layers", "clothing", true, { quantity: 2 }),
    item("Insulated pants", "clothing", true),
    item("Wool socks", "clothing", true, { quantity: 3 }),
    item("Underwear", "clothing", true, { quantity: 3 }),

    // Layers & Warmth
    item("Heavy winter coat", "layers_warmth", true, { gearClosetEligible: true }),
    item("Insulating mid layers", "layers_warmth", true),
    item("Warm hat / beanie", "layers_warmth", true),
    item("Insulated gloves", "layers_warmth", true),
    item("Neck gaiter / balaclava", "layers_warmth", true),
    item("Hand warmers", "layers_warmth", false, { quantity: 6 }),
    item("Toe warmers", "layers_warmth", false, { quantity: 4 }),

    // Footwear
    item("Insulated winter boots", "footwear", true),
    item("Warm camp booties", "footwear", false),
    item("Boot dryers / extra liners", "footwear", false),

    // Hygiene
    item("Toiletry kit", "hygiene", true),
    item("Hand sanitizer", "hygiene", true),

    // First Aid
    item("First aid kit", "first_aid", true, { gearClosetEligible: true }),
    item("Lip balm", "first_aid", true),
    item("Personal medications", "first_aid", true),

    // Navigation & Safety
    item("Headlamp", "navigation_safety", true, { gearClosetEligible: true }),
    item("Extra batteries", "navigation_safety", true),
    item("Lantern", "navigation_safety", false, { gearClosetEligible: true }),
    item("Emergency blanket", "navigation_safety", true),
    item("Car emergency kit", "navigation_safety", true),
    item("Small shovel", "navigation_safety", true),

    // Camp Comfort
    item("Insulated camp chair pad", "camp_comfort", false),
    item("Camp chairs", "camp_comfort", false, { gearClosetEligible: true }),

    // Electronics
    item("Phone charger", "electronics", true),
    item("Power bank (keep warm)", "electronics", false),

    // Documents & Essentials
    item("Reservation confirmation", "documents_essentials", true),
    item("ID", "documents_essentials", true),
  ],
};

// ============================================================================
// HAMMOCK CAMPING TEMPLATES
// ============================================================================

const threeSeasonHammock: TemplateDefinition = {
  template: {
    name: "3-Season Hammock Camping",
    description: "Swing in comfort through spring, summer, and fall",
    isSystem: true,
    tripTypes: ["hammock"],
    seasons: ["spring", "summer", "fall"],
    defaultNights: 2,
    tags: ["hammock", "lightweight"],
    useCount: 0,
  },
  items: [
    // Shelter
    item("Hammock", "shelter", true, { gearGroup: "shelterPrimary", variant: "hammock", gearClosetEligible: true }),
    item("Suspension straps", "shelter", true, { gearClosetEligible: true }),
    item("Rain tarp", "shelter", true, { gearClosetEligible: true }),
    item("Stakes", "shelter", true),
    item("Bug net", "shelter", true, { notes: "If not integrated", gearClosetEligible: true }),
    item("Ridgeline organizer", "shelter", false),

    // Sleep
    item("Top quilt or sleeping bag", "sleep", true, { gearGroup: "sleepPrimary", variant: "mid", gearClosetEligible: true }),
    item("Underquilt", "sleep", true, { gearClosetEligible: true }),
    item("Pillow", "sleep", false, { gearClosetEligible: true }),
    item("Sleep clothes", "sleep", false),

    // Rain & Weather
    item("Rain jacket", "rain_weather", true, { gearClosetEligible: true }),
    item("Tarp tensioners", "rain_weather", false),

    // Lighting
    item("Headlamp", "lighting", true, { gearClosetEligible: true }),

    // Tools & Repairs
    item("Spare strap hardware", "tools_repairs", false),
    item("Hammock patch kit", "tools_repairs", false),

    // (Include standard backpacking items for water, kitchen, etc.)
    item("Water filter", "water", true, { gearClosetEligible: true }),
    item("Water bottles", "water", true, { quantity: 2 }),
    item("Backpacking stove", "kitchen", true, { gearClosetEligible: true }),
    item("Fuel", "kitchen", true),
    item("Pot", "kitchen", true, { gearClosetEligible: true }),
    item("Spork", "kitchen", true),
    item("Food for trip", "food", true),
    item("Snacks", "food", true),
    item("Hiking clothes", "clothing", true),
    item("Socks", "clothing", true, { quantity: 2 }),
    item("Hiking shoes", "footwear", true),
    item("First aid kit", "first_aid", true, { gearClosetEligible: true }),
    item("Toiletries", "hygiene", true),
    item("Knife", "tools_repairs", true, { gearClosetEligible: true }),
    item("Phone", "electronics", true),
    item("ID and permits", "documents_essentials", true),
  ],
};

const winterHammock: TemplateDefinition = {
  template: {
    name: "Winter Hammock Camping",
    description: "Cold-weather hammock setup with serious insulation",
    isSystem: true,
    tripTypes: ["hammock", "winter_camping"],
    seasons: ["winter"],
    defaultNights: 2,
    tags: ["hammock", "winter", "cold"],
    useCount: 0,
  },
  items: [
    // Shelter
    item("Hammock", "shelter", true, { gearGroup: "shelterPrimary", variant: "hammock", gearClosetEligible: true }),
    item("Suspension straps", "shelter", true, { gearClosetEligible: true }),
    item("Winter tarp (full coverage)", "shelter", true, { gearClosetEligible: true }),
    item("Stakes", "shelter", true),
    item("Wind socks / tarp doors", "shelter", false),

    // Sleep
    item("Top quilt (0–20°F)", "sleep", true, { gearGroup: "sleepPrimary", variant: "cold", gearClosetEligible: true }),
    item("Winter underquilt", "sleep", true, { gearClosetEligible: true }),
    item("Underquilt protector", "sleep", false),
    item("Pillow", "sleep", false, { gearClosetEligible: true }),

    // Layers & Warmth
    item("Insulating jacket", "layers_warmth", true, { gearClosetEligible: true }),
    item("Base layers", "layers_warmth", true),
    item("Warm hat", "layers_warmth", true),
    item("Insulated gloves", "layers_warmth", true),
    item("Hand warmers", "layers_warmth", false, { quantity: 4 }),
    item("Hot water bottle", "layers_warmth", false),

    // (Standard backpacking essentials)
    item("4-season sleeping pad (backup)", "sleep", false, { gearClosetEligible: true }),
    item("Water bottles (insulated)", "water", true, { quantity: 2 }),
    item("Water filter", "water", true, { gearClosetEligible: true }),
    item("Backpacking stove", "kitchen", true, { gearClosetEligible: true }),
    item("Fuel", "kitchen", true, { quantity: 2 }),
    item("Pot", "kitchen", true, { gearClosetEligible: true }),
    item("Insulated mug", "kitchen", true),
    item("Hot meals", "food", true),
    item("High-calorie snacks", "food", true),
    item("Wool socks", "clothing", true, { quantity: 3 }),
    item("Insulated boots", "footwear", true),
    item("Camp booties", "footwear", false),
    item("First aid kit", "first_aid", true, { gearClosetEligible: true }),
    item("Headlamp + batteries", "lighting", true, { gearClosetEligible: true }),
    item("Emergency blanket", "navigation_safety", true),
    item("Knife", "tools_repairs", true, { gearClosetEligible: true }),
    item("Phone", "electronics", true),
    item("ID and permits", "documents_essentials", true),
  ],
};

// ============================================================================
// RV / TRAILER TEMPLATES
// ============================================================================

const rvCamping: TemplateDefinition = {
  template: {
    name: "RV Camping Weekend",
    description: "Essentials for a comfortable RV or trailer camping trip",
    isSystem: true,
    tripTypes: ["rv_trailer"],
    seasons: ["spring", "summer", "fall"],
    defaultNights: 2,
    tags: ["rv", "trailer", "glamping"],
    useCount: 0,
  },
  items: [
    // Documents & Essentials
    item("Reservation confirmation", "documents_essentials", true),
    item("IDs", "documents_essentials", true),
    item("RV manual", "documents_essentials", false),

    // Kitchen
    item("Pantry basics", "kitchen", true),
    item("Cookware", "kitchen", true),
    item("Dishes and utensils", "kitchen", true),
    item("Paper towels", "kitchen", true),
    item("Trash bags", "kitchen", true),
    item("Dish soap", "kitchen", true),
    item("Coffee maker or supplies", "kitchen", false),

    // Water
    item("Fresh water hose", "water", true),
    item("Water pressure regulator", "water", false),
    item("Water filter", "water", false),

    // Tools & Repairs
    item("Leveling blocks", "tools_repairs", true),
    item("Wheel chocks", "tools_repairs", true),
    item("Basic toolkit", "tools_repairs", false),
    item("Sewer hose kit", "tools_repairs", true),
    item("Power adapter (30A/50A)", "tools_repairs", false),
    item("Extension cord", "tools_repairs", false),

    // Camp Comfort
    item("Outdoor mat", "camp_comfort", false),
    item("Camp chairs", "camp_comfort", true, { gearClosetEligible: true }),
    item("String lights", "camp_comfort", false),
    item("Outdoor table", "camp_comfort", false),

    // Hygiene
    item("Toiletries", "hygiene", true),
    item("Towels", "hygiene", true),
    item("RV toilet chemicals", "hygiene", false),

    // Electronics
    item("Phone charger", "electronics", true),
    item("TV remote / streaming device", "electronics", false),

    // Food
    item("Groceries", "food", true),
    item("Snacks", "food", true),
    item("Beverages", "food", false),

    // Clothing
    item("Casual clothes", "clothing", true),
    item("Sleepwear", "clothing", true),
    item("Rain jacket", "clothing", false),

    // First Aid
    item("First aid kit", "first_aid", true),
    item("Personal medications", "first_aid", true),
  ],
};

// ============================================================================
// FAMILY CAMPING TEMPLATE
// ============================================================================

const familyCamping: TemplateDefinition = {
  template: {
    name: "Family Campground Weekend",
    description: "Everything the whole family needs for a fun camping trip",
    isSystem: true,
    tripTypes: ["family_camping", "car_camping"],
    seasons: ["spring", "summer", "fall"],
    defaultNights: 2,
    tags: ["family", "kids", "campground"],
    useCount: 0,
  },
  items: [
    // Shelter
    item("Family tent", "shelter", true, { gearClosetEligible: true }),
    item("Stakes and guylines", "shelter", true),
    item("Mallet", "shelter", false),
    item("Footprint", "shelter", false),

    // Sleep
    item("Sleeping bags for all", "sleep", true),
    item("Sleeping pads or air mattresses", "sleep", true),
    item("Pillows", "sleep", true),
    item("Extra blankets", "sleep", false),
    item("Kids' comfort items", "sleep", false, { notes: "Stuffed animals, etc." }),

    // Kitchen
    item("Camp stove", "kitchen", true, { gearClosetEligible: true }),
    item("Fuel", "kitchen", true),
    item("Large cooler", "kitchen", true, { gearClosetEligible: true }),
    item("Ice", "kitchen", true),
    item("Cookware", "kitchen", true),
    item("Plates and utensils for all", "kitchen", true),
    item("Kid-friendly cups", "kitchen", true),
    item("Cutting board", "kitchen", false),
    item("Trash bags (extra)", "kitchen", true),
    item("Paper towels", "kitchen", true),
    item("Dish supplies", "kitchen", true),

    // Water
    item("Water jugs", "water", true),
    item("Water bottles for kids", "water", true),

    // Food
    item("Kid-friendly meals", "food", true),
    item("Lots of snacks", "food", true, { notes: "More than you think!" }),
    item("S'mores supplies", "food", false),
    item("Beverages", "food", true),

    // Clothing
    item("Clothes for all (layers)", "clothing", true),
    item("Extra kid clothes", "clothing", true, { notes: "They get dirty fast" }),
    item("Swimsuits", "clothing", false),
    item("Sleepwear for all", "clothing", true),

    // Hygiene
    item("Toiletries for family", "hygiene", true),
    item("Baby wipes / wet wipes", "hygiene", true),
    item("Diapers (if needed)", "hygiene", false),
    item("Hand sanitizer", "hygiene", true),
    item("Towels", "hygiene", false),
    item("Sunscreen", "hygiene", true),
    item("Bug spray (kid-safe)", "hygiene", true),

    // First Aid
    item("Family first aid kit", "first_aid", true),
    item("Kid medications", "first_aid", true),
    item("Bandaids (lots)", "first_aid", true),
    item("Bug bite relief", "first_aid", false),

    // Camp Comfort
    item("Camp chairs for all", "camp_comfort", true),
    item("Camp table", "camp_comfort", false, { gearClosetEligible: true }),
    item("Hammock", "camp_comfort", false),
    item("Shade canopy", "camp_comfort", false),

    // Entertainment
    item("Games and cards", "optional_extras", false),
    item("Glow sticks", "optional_extras", false),
    item("Sports equipment", "optional_extras", false, { notes: "Frisbee, ball, etc." }),
    item("Kid bikes / helmets", "optional_extras", false),
    item("Books or coloring", "optional_extras", false),

    // Navigation & Safety
    item("Headlamps / flashlights", "navigation_safety", true),
    item("Lantern", "navigation_safety", false, { gearClosetEligible: true }),
    item("Fire supplies", "navigation_safety", true),
    item("Whistle for kids", "navigation_safety", false),

    // Electronics
    item("Phone chargers", "electronics", true),
    item("Portable speaker", "electronics", false),

    // Documents & Essentials
    item("Reservation info", "documents_essentials", true),
    item("IDs", "documents_essentials", true),
  ],
};

// ============================================================================
// DISPERSED / OVERLANDING TEMPLATES
// ============================================================================

const dispersedCamping: TemplateDefinition = {
  template: {
    name: "Dispersed Car Camping",
    description: "Self-sufficient camping away from developed campgrounds",
    isSystem: true,
    tripTypes: ["dispersed", "car_camping"],
    seasons: ["spring", "summer", "fall"],
    defaultNights: 2,
    tags: ["dispersed", "primitive", "self-sufficient"],
    useCount: 0,
  },
  items: [
    // Water - Critical for dispersed
    item("Water containers", "water", true, { quantity: 2, notes: "Extra capacity essential" }),
    item("Water filter or purification", "water", true),
    item("Backup purification tablets", "water", true),

    // Shelter
    item("Tent", "shelter", true, { gearClosetEligible: true }),
    item("Stakes and guylines", "shelter", true),
    item("Ground tarp", "shelter", true),

    // Sleep
    item("Sleeping bag", "sleep", true, { gearClosetEligible: true }),
    item("Sleeping pad", "sleep", true, { gearClosetEligible: true }),
    item("Pillow", "sleep", false),

    // Kitchen
    item("Camp stove", "kitchen", true, { gearClosetEligible: true }),
    item("Fuel (extra)", "kitchen", true),
    item("Cooler", "kitchen", true),
    item("Cookware", "kitchen", true),
    item("Utensils", "kitchen", true),
    item("Biodegradable soap", "kitchen", true),
    item("Trash bags (pack it out)", "kitchen", true),

    // Navigation & Safety - Critical
    item("Offline maps downloaded", "navigation_safety", true),
    item("GPS device or phone with GPS", "navigation_safety", true),
    item("Satellite messenger", "navigation_safety", false, { notes: "InReach, SPOT, etc." }),
    item("Emergency kit", "navigation_safety", true),
    item("Headlamp + batteries", "navigation_safety", true),
    item("Fire extinguisher", "navigation_safety", true),

    // Hygiene - Leave No Trace
    item("Trowel", "hygiene", true),
    item("Toilet paper", "hygiene", true),
    item("Waste bags", "hygiene", true),
    item("Hand sanitizer", "hygiene", true),
    item("Camp shower (optional)", "hygiene", false),

    // Tools & Repairs - Vehicle prep
    item("Tire repair kit", "tools_repairs", false),
    item("Air compressor", "tools_repairs", false),
    item("Recovery strap", "tools_repairs", false),
    item("Shovel", "tools_repairs", true),
    item("Basic tool kit", "tools_repairs", false),
    item("Jumper cables", "tools_repairs", true),

    // Food
    item("Non-perishable meals", "food", true),
    item("Snacks", "food", true),

    // Clothing
    item("Weather-appropriate clothes", "clothing", true),
    item("Layers", "clothing", true),

    // First Aid
    item("First aid kit (comprehensive)", "first_aid", true),
    item("Personal medications", "first_aid", true),

    // Electronics
    item("Phone charger (car)", "electronics", true),
    item("Power bank", "electronics", true),

    // Documents
    item("Offline maps", "documents_essentials", true),
    item("Land use permits if required", "documents_essentials", false),
    item("ID", "documents_essentials", true),
  ],
};

// ============================================================================
// EXPORT ALL TEMPLATES
// ============================================================================

export const PACKING_TEMPLATES: TemplateDefinition[] = [
  summerCarCamping,
  fallCarCamping,
  winterCarCamping,
  summerBackpacking,
  winterBackpacking,
  threeSeasonHammock,
  winterHammock,
  familyCamping,
  dispersedCamping,
  rvCamping,
];

/**
 * Get template by ID
 */
export function getTemplateById(templateId: string): TemplateDefinition | undefined {
  return PACKING_TEMPLATES.find(
    (t) => t.template.name.toLowerCase().replace(/\s+/g, "_") === templateId
  );
}

/**
 * Get recommended templates for trip type and season
 */
export function getRecommendedTemplates(tripType?: TripType, season?: Season): TemplateDefinition[] {
  return PACKING_TEMPLATES.filter((t) => {
    const matchesTripType = !tripType || t.template.tripTypes.includes(tripType);
    const matchesSeason = !season || t.template.seasons.includes(season);
    return matchesTripType && matchesSeason;
  });
}

/**
 * Generate template ID from name
 */
export function generateTemplateId(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
}
