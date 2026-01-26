/**
 * Meal Types - Single Source of Truth
 * 
 * This file defines the canonical meal types used throughout the app.
 * All meal-related components should import from here to ensure consistency.
 */

/**
 * The four meal slots available in the app.
 * Note: "snacks" is plural to match the UI label convention.
 */
export type MealType = "breakfast" | "lunch" | "dinner" | "snacks";

/**
 * Array of all meal types for iteration.
 */
export const MEAL_TYPES: { key: MealType; label: string; icon: string }[] = [
  { key: "breakfast", label: "Breakfast", icon: "sunny" },
  { key: "lunch", label: "Lunch", icon: "restaurant" },
  { key: "dinner", label: "Dinner", icon: "moon" },
  { key: "snacks", label: "Snacks", icon: "ice-cream" },
];

/**
 * Just the keys for quick access
 */
export const MEAL_TYPE_KEYS: MealType[] = ["breakfast", "lunch", "dinner", "snacks"];

/**
 * Labels for each meal type
 */
export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snacks: "Snacks",
};

/**
 * Icons for each meal type (Ionicons names)
 */
export const MEAL_TYPE_ICONS: Record<MealType, string> = {
  breakfast: "sunny",
  lunch: "restaurant",
  dinner: "moon",
  snacks: "ice-cream",
};

/**
 * Keywords used to infer meal types from recipe names/descriptions.
 * Used for migrating legacy recipes without explicit mealTypes.
 */
export const MEAL_TYPE_KEYWORDS: Record<MealType, string[]> = {
  breakfast: [
    "breakfast",
    "pancake",
    "oat",
    "oatmeal",
    "granola",
    "egg",
    "bacon",
    "sausage",
    "toast",
    "waffle",
    "cereal",
    "morning",
    "coffee",
    "brunch",
  ],
  lunch: [
    "sandwich",
    "wrap",
    "salad",
    "soup",
    "sub",
    "panini",
    "burger",
    "midday",
    "noon",
  ],
  dinner: [
    "stew",
    "chili",
    "pasta",
    "curry",
    "roast",
    "grill",
    "bbq",
    "barbeque",
    "dinner",
    "supper",
    "entree",
    "main course",
    "casserole",
    "one-pot",
    "dutch oven",
    "skillet",
    "fajita",
    "taco",
    "burrito",
    "pizza",
    "chicken",
    "steak",
    "fish",
    "salmon",
    "shrimp",
  ],
  snacks: [
    "snack",
    "trail mix",
    "bar",
    "jerky",
    "nuts",
    "chips",
    "popcorn",
    "s'more",
    "smore",
    "fruit",
    "cracker",
    "cheese and crackers",
    "dip",
    "hummus",
    "dessert",
    "cookie",
    "brownie",
    "treat",
  ],
};

/**
 * Infer meal types from a recipe name and/or description.
 * Returns an array of matching meal types, or ["dinner"] as default.
 * 
 * @param name - Recipe name
 * @param description - Optional recipe description
 * @param existingCategory - Existing category field if present (for legacy compat)
 * @returns Array of inferred MealTypes (1-2 items typically)
 */
export function inferMealTypes(
  name: string,
  description?: string,
  existingCategory?: string
): MealType[] {
  const searchText = `${name} ${description || ""}`.toLowerCase();
  const matches: MealType[] = [];

  // First, check if existing category maps directly
  if (existingCategory) {
    const normalized = existingCategory.toLowerCase();
    if (normalized === "breakfast") matches.push("breakfast");
    else if (normalized === "lunch") matches.push("lunch");
    else if (normalized === "dinner") matches.push("dinner");
    else if (normalized === "snack" || normalized === "snacks") matches.push("snacks");
  }

  // Then check keywords for each type
  for (const [mealType, keywords] of Object.entries(MEAL_TYPE_KEYWORDS)) {
    if (matches.includes(mealType as MealType)) continue; // Already matched via category

    for (const keyword of keywords) {
      if (searchText.includes(keyword)) {
        matches.push(mealType as MealType);
        break; // Only add each type once
      }
    }
  }

  // Limit to max 2 matches
  if (matches.length > 2) {
    return matches.slice(0, 2);
  }

  // Default to dinner if no matches
  if (matches.length === 0) {
    return ["dinner"];
  }

  return matches;
}

/**
 * Convert legacy MealCategory ("snack") to MealType ("snacks")
 */
export function mealCategoryToMealType(category: string): MealType {
  const normalized = category.toLowerCase();
  if (normalized === "snack") return "snacks";
  if (normalized === "breakfast" || normalized === "lunch" || normalized === "dinner" || normalized === "snacks") {
    return normalized as MealType;
  }
  return "dinner"; // default
}

/**
 * Convert MealType ("snacks") to MealCategory ("snack") for legacy compatibility
 */
export function mealTypeToMealCategory(mealType: MealType): "breakfast" | "lunch" | "dinner" | "snack" {
  if (mealType === "snacks") return "snack";
  return mealType;
}
