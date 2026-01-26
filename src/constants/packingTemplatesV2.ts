/**
 * Packing Templates V2 - Simplified template system
 * 9 pre-built templates with ~117+ items total
 */

import { Ionicons } from "@expo/vector-icons";
import { PackingTemplateKey } from "../state/packingStore";

// ============================================================================
// TYPES
// ============================================================================

export interface PackingTemplateItem {
  name: string;
  category: string;
  essential: boolean;
}

export interface PackingTemplate {
  key: PackingTemplateKey;
  name: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  items: PackingTemplateItem[];
}

// ============================================================================
// DEFAULT SECTIONS (empty list categories)
// ============================================================================

export const DEFAULT_SECTIONS = [
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
];

// ============================================================================
// TEMPLATES
// ============================================================================

const ESSENTIAL_CAMPING: PackingTemplate = {
  key: "essential",
  name: "Essential Camping Gear",
  description: "The must-have basics for any camping trip",
  icon: "checkmark-circle",
  items: [
    { name: "Tent", category: "Shelter & Sleep", essential: true },
    { name: "Tent footprint/ground cloth", category: "Shelter & Sleep", essential: false },
    { name: "Tent stakes", category: "Shelter & Sleep", essential: true },
    { name: "Sleeping bag", category: "Shelter & Sleep", essential: true },
    { name: "Sleeping pad", category: "Shelter & Sleep", essential: true },
    { name: "Pillow", category: "Shelter & Sleep", essential: false },
    { name: "Camp stove", category: "Meal Prep", essential: true },
    { name: "Fuel", category: "Meal Prep", essential: true },
    { name: "Lighter/matches", category: "Meal Prep", essential: true },
    { name: "Headlamp", category: "Navigation & Safety", essential: true },
    { name: "Extra batteries", category: "Navigation & Safety", essential: true },
    { name: "First aid kit", category: "Navigation & Safety", essential: true },
    { name: "Axe", category: "Tools & Utilities", essential: false },
    { name: "Mallet", category: "Tools & Utilities", essential: false },
    { name: "Multi-tool or knife", category: "Tools & Utilities", essential: true },
    { name: "Rope", category: "Tools & Utilities", essential: false },
  ],
};

const COOKING_FOOD: PackingTemplate = {
  key: "cooking",
  name: "Cooking & Food",
  description: "Food and beverage items for your trip",
  icon: "restaurant",
  items: [
    // Cooking & Food items (alphabetized)
    { name: "Beverages", category: "Cooking & Food", essential: false },
    { name: "Coffee/Tea", category: "Cooking & Food", essential: false },
    { name: "Condiments", category: "Cooking & Food", essential: false },
    { name: "Groceries from Meal Plan Shopping List", category: "Cooking & Food", essential: true },
    { name: "S'mores supplies", category: "Cooking & Food", essential: false },
    { name: "Spices", category: "Cooking & Food", essential: false },
    { name: "Sugar", category: "Cooking & Food", essential: false },
    { name: "Water", category: "Cooking & Food", essential: true },
    // Meal Prep items (alphabetized)
    { name: "Bear canister/hang bag", category: "Meal Prep", essential: false },
    { name: "Camp stove", category: "Meal Prep", essential: true },
    { name: "Camp-safe dish soap & sponge", category: "Meal Prep", essential: true },
    { name: "Campfire skewers", category: "Meal Prep", essential: false },
    { name: "Cooking supplies", category: "Meal Prep", essential: true },
    { name: "Cooking utensils", category: "Meal Prep", essential: true },
    { name: "Cooler", category: "Meal Prep", essential: false },
    { name: "Cups/mugs", category: "Meal Prep", essential: true },
    { name: "Cutting board", category: "Meal Prep", essential: false },
    { name: "Food storage containers", category: "Meal Prep", essential: false },
    { name: "Fuel canister", category: "Meal Prep", essential: true },
    { name: "Lighter/matches", category: "Meal Prep", essential: true },
    { name: "Plates/bowls", category: "Meal Prep", essential: true },
    { name: "Pots/pans", category: "Meal Prep", essential: true },
    { name: "Trash bags", category: "Meal Prep", essential: true },
    { name: "Water bottles", category: "Meal Prep", essential: true },
    { name: "Water filter/purification", category: "Meal Prep", essential: false },
  ],
};

const SAFETY_FIRST_AID: PackingTemplate = {
  key: "safety",
  name: "Safety & First Aid",
  description: "Be prepared for emergencies",
  icon: "medkit",
  items: [
    { name: "First aid kit", category: "Navigation & Safety", essential: true },
    { name: "Emergency whistle", category: "Navigation & Safety", essential: true },
    { name: "Emergency blanket", category: "Navigation & Safety", essential: true },
    { name: "Sunscreen", category: "Personal Care", essential: true },
    { name: "Bug spray", category: "Personal Care", essential: true },
    { name: "Personal medications", category: "Personal Care", essential: true },
    { name: "Map/GPS", category: "Navigation & Safety", essential: false },
  ],
};

const CLOTHING_PERSONAL: PackingTemplate = {
  key: "clothing",
  name: "Clothing & Personal",
  description: "Clothes and personal items",
  icon: "shirt",
  items: [
    { name: "Hiking pants/shorts", category: "Clothing", essential: true },
    { name: "T-shirts", category: "Clothing", essential: true },
    { name: "Underwear", category: "Clothing", essential: true },
    { name: "Socks (wool preferred)", category: "Clothing", essential: true },
    { name: "Rain jacket", category: "Clothing", essential: true },
    { name: "Warm layer (fleece/jacket)", category: "Clothing", essential: true },
    { name: "Sleep clothes", category: "Clothing", essential: false },
    { name: "Hat/cap", category: "Clothing", essential: false },
    // Toiletries
    { name: "Toothbrush", category: "Personal Care", essential: true },
    { name: "Toothpaste", category: "Personal Care", essential: true },
    { name: "Deodorant", category: "Personal Care", essential: false },
    { name: "Soap (or camp soap)", category: "Personal Care", essential: true },
    { name: "Body wipes or baby wipes", category: "Personal Care", essential: false },
    { name: "Hand sanitizer", category: "Personal Care", essential: true },
    { name: "Toilet paper", category: "Personal Care", essential: true },
    { name: "Sunscreen", category: "Personal Care", essential: true },
    { name: "Bug spray", category: "Personal Care", essential: true },
    { name: "Medications (daily meds)", category: "Personal Care", essential: true },
    { name: "Feminine hygiene products", category: "Personal Care", essential: false },
  ],
};

const MEAL_PLANNING: PackingTemplate = {
  key: "meals",
  name: "Meal Planning Essentials",
  description: "Food and meal prep items",
  icon: "nutrition",
  items: [
    // Cooking & Food items (alphabetized)
    { name: "Beverages", category: "Cooking & Food", essential: false },
    { name: "Coffee/Tea", category: "Cooking & Food", essential: false },
    { name: "Condiments", category: "Cooking & Food", essential: false },
    { name: "Groceries from Meal Plan Shopping List", category: "Cooking & Food", essential: true },
    { name: "S'mores supplies", category: "Cooking & Food", essential: false },
    { name: "Spices", category: "Cooking & Food", essential: false },
    { name: "Sugar", category: "Cooking & Food", essential: false },
    { name: "Water", category: "Cooking & Food", essential: true },
    // Meal Prep items (alphabetized)
    { name: "Bear canister/hang bag", category: "Meal Prep", essential: false },
    { name: "Food storage containers", category: "Meal Prep", essential: false },
    { name: "Trash bags", category: "Meal Prep", essential: true },
    { name: "Water bottles", category: "Meal Prep", essential: true },
    { name: "Water filter/purification", category: "Meal Prep", essential: false },
  ],
};

const BACKPACKING: PackingTemplate = {
  key: "backpacking",
  name: "Backpacking Essentials",
  description: "Lightweight gear for backcountry trips",
  icon: "walk",
  items: [
    { name: "Backpack (60-70L)", category: "Other", essential: true },
    { name: "Ultralight tent", category: "Shelter & Sleep", essential: true },
    { name: "Lightweight sleeping bag", category: "Shelter & Sleep", essential: true },
    { name: "Inflatable sleeping pad", category: "Shelter & Sleep", essential: true },
    { name: "Trekking poles", category: "Tools & Utilities", essential: false },
    { name: "Trail runners/hiking boots", category: "Clothing", essential: true },
    { name: "Gaiters", category: "Clothing", essential: false },
    { name: "Water bladder", category: "Meal Prep", essential: true },
    { name: "Water filter", category: "Meal Prep", essential: true },
    { name: "Lightweight stove", category: "Meal Prep", essential: true },
    { name: "Bear canister", category: "Meal Prep", essential: false },
    { name: "Trowel", category: "Personal Care", essential: true },
  ],
};

const CAR_CAMPING: PackingTemplate = {
  key: "car-camping",
  name: "Car Camping Comfort",
  description: "Extra comfort items when weight isn't a concern",
  icon: "car",
  items: [
    { name: "Camp chairs", category: "Camp Furniture", essential: false },
    { name: "Camp table", category: "Camp Furniture", essential: false },
    { name: "Lantern", category: "Navigation & Safety", essential: false },
    { name: "Large cooler", category: "Meal Prep", essential: true },
    { name: "Ice", category: "Meal Prep", essential: true },
    { name: "Tablecloth", category: "Camp Furniture", essential: false },
    { name: "Camp rug", category: "Camp Furniture", essential: false },
    { name: "Air mattress", category: "Shelter & Sleep", essential: false },
    { name: "Extra blankets", category: "Shelter & Sleep", essential: false },
    { name: "Portable speaker", category: "Entertainment", essential: false },
    { name: "Games/cards", category: "Entertainment", essential: false },
  ],
};

const WINTER_CAMPING: PackingTemplate = {
  key: "winter",
  name: "Winter Camping",
  description: "Stay warm in cold weather",
  icon: "snow",
  items: [
    { name: "4-season tent", category: "Shelter & Sleep", essential: true },
    { name: "Cold-rated sleeping bag (0-20°F)", category: "Shelter & Sleep", essential: true },
    { name: "Insulated sleeping pad (R4+)", category: "Shelter & Sleep", essential: true },
    { name: "Insulated jacket", category: "Clothing", essential: true },
    { name: "Base layers (top & bottom)", category: "Clothing", essential: true },
    { name: "Warm hat/beanie", category: "Clothing", essential: true },
    { name: "Insulated gloves", category: "Clothing", essential: true },
    { name: "Warm socks (wool)", category: "Clothing", essential: true },
    { name: "Insulated boots", category: "Clothing", essential: true },
    { name: "Hand/toe warmers", category: "Clothing", essential: false },
    { name: "Hot drink supplies", category: "Cooking & Food", essential: false },
    { name: "Snow stakes", category: "Shelter & Sleep", essential: false },
  ],
};

const PETS: PackingTemplate = {
  key: "pets",
  name: "Camping with Pets",
  description: "Everything your furry friend needs",
  icon: "paw",
  items: [
    // Food & Water
    { name: "Dog food (measured portions)", category: "Pet Supplies", essential: true },
    { name: "Collapsible food bowl", category: "Pet Supplies", essential: true },
    { name: "Collapsible water bowl", category: "Pet Supplies", essential: true },
    { name: "Treats", category: "Pet Supplies", essential: false },
    { name: "Food container", category: "Pet Supplies", essential: true },
    // Comfort & Sleep
    { name: "Dog bed or blanket", category: "Pet Supplies", essential: true },
    { name: "Familiar toy", category: "Pet Supplies", essential: false },
    { name: "Dog jacket (if cold)", category: "Pet Supplies", essential: false },
    // Safety & Control
    { name: "Leash", category: "Pet Supplies", essential: true },
    { name: "Collar with ID tags", category: "Pet Supplies", essential: true },
    { name: "Long tie-out line", category: "Pet Supplies", essential: false },
    { name: "Stake for tie-out", category: "Pet Supplies", essential: false },
    { name: "Harness", category: "Pet Supplies", essential: false },
    { name: "Dog boots (for rough terrain)", category: "Pet Supplies", essential: false },
    // Health & Hygiene
    { name: "Pet first aid kit", category: "Pet Supplies", essential: true },
    { name: "Flea/tick prevention", category: "Pet Supplies", essential: true },
    { name: "Medications (if needed)", category: "Pet Supplies", essential: true },
    { name: "Poop bags", category: "Pet Supplies", essential: true },
    { name: "Towel for drying", category: "Pet Supplies", essential: false },
    { name: "Dog-safe bug spray", category: "Pet Supplies", essential: false },
    { name: "Dog sunscreen (for light-colored dogs)", category: "Pet Supplies", essential: false },
    // Cleanup
    { name: "Pet brush", category: "Pet Supplies", essential: false },
    { name: "Enzyme cleaner", category: "Pet Supplies", essential: false },
    // Documents
    { name: "Vaccination records", category: "Pet Supplies", essential: true },
    { name: "Recent photo of pet", category: "Pet Supplies", essential: false },
    { name: "Vet contact info", category: "Pet Supplies", essential: true },
    // Night Safety
    { name: "Reflective collar or light", category: "Pet Supplies", essential: true },
    { name: "Glow stick for collar", category: "Pet Supplies", essential: false },
    // Car Travel
    { name: "Car seat cover/liner", category: "Pet Supplies", essential: false },
    { name: "Car safety harness or crate", category: "Pet Supplies", essential: false },
    // Extras
    { name: "Portable water bottle with bowl", category: "Pet Supplies", essential: false },
    { name: "Cooling mat (for hot weather)", category: "Pet Supplies", essential: false },
    { name: "Calming treats or spray", category: "Pet Supplies", essential: false },
  ],
};

const FAMILY_CAMPING: PackingTemplate = {
  key: "family",
  name: "Family Camping",
  description: "Extra items for camping with kids",
  icon: "people",
  items: [
    { name: "Large family tent", category: "Shelter & Sleep", essential: true },
    { name: "Sleeping bags for all", category: "Shelter & Sleep", essential: true },
    { name: "Sleeping pads/air mattresses", category: "Shelter & Sleep", essential: true },
    { name: "Extra blankets", category: "Shelter & Sleep", essential: false },
    { name: "Kids' comfort items", category: "Shelter & Sleep", essential: false },
    { name: "Kid-friendly meals", category: "Cooking & Food", essential: true },
    { name: "Lots of snacks", category: "Cooking & Food", essential: true },
    { name: "S'mores supplies", category: "Cooking & Food", essential: false },
    { name: "Kid-friendly cups/plates", category: "Meal Prep", essential: true },
    { name: "Wet wipes/baby wipes", category: "Personal Care", essential: true },
    { name: "Diapers (if needed)", category: "Personal Care", essential: false },
    { name: "Kid sunscreen", category: "Personal Care", essential: true },
    { name: "Kid-safe bug spray", category: "Personal Care", essential: true },
    { name: "Extra kid clothes", category: "Clothing", essential: true },
    { name: "Swimsuits", category: "Clothing", essential: false },
    { name: "Games and toys", category: "Entertainment", essential: false },
    { name: "Glow sticks", category: "Entertainment", essential: false },
    { name: "Coloring books/crayons", category: "Entertainment", essential: false },
    { name: "Frisbee/ball", category: "Entertainment", essential: false },
    { name: "Flashlight for each kid", category: "Navigation & Safety", essential: true },
    { name: "Whistle for each kid", category: "Navigation & Safety", essential: true },
    { name: "Camp chairs for all", category: "Camp Furniture", essential: false },
  ],
};

// ============================================================================
// EXPORT ALL TEMPLATES
// ============================================================================

export const PACKING_TEMPLATES: PackingTemplate[] = [
  ESSENTIAL_CAMPING,
  COOKING_FOOD,
  SAFETY_FIRST_AID,
  CLOTHING_PERSONAL,
  MEAL_PLANNING,
  BACKPACKING,
  CAR_CAMPING,
  WINTER_CAMPING,
  PETS,
  FAMILY_CAMPING,
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getTemplatesByKeys(keys: PackingTemplateKey[]): PackingTemplate[] {
  return PACKING_TEMPLATES.filter((t) => keys.includes(t.key));
}

export function getTemplateByKey(key: PackingTemplateKey): PackingTemplate | undefined {
  return PACKING_TEMPLATES.find((t) => t.key === key);
}

// ============================================================================
// TRIP TYPE & SEASON OPTIONS
// ============================================================================

export const TRIP_TYPE_OPTIONS = [
  { value: "one-night", label: "One Night", icon: "moon" as const },
  { value: "weekend", label: "Weekend", icon: "calendar" as const },
  { value: "multi-day", label: "Multi-Day", icon: "calendar-outline" as const },
  { value: "backpacking", label: "Backpacking", icon: "walk" as const },
  { value: "car-camping", label: "Car Camping", icon: "car" as const },
  { value: "day-hike", label: "Day Hike", icon: "sunny" as const },
];

export const SEASON_OPTIONS = [
  { value: "spring", label: "Spring", icon: "flower" as const },
  { value: "summer", label: "Summer", icon: "sunny" as const },
  { value: "fall", label: "Fall", icon: "leaf" as const },
  { value: "winter", label: "Winter", icon: "snow" as const },
];
