/**
 * Enhanced Meal Planning Types
 * Best-in-class meal planning experience with rich metadata
 */

// Cooking methods for camping meals
export type CookingMethod = 
  | "campfire" 
  | "camp-stove" 
  | "no-cook" 
  | "grill" 
  | "dutch-oven" 
  | "foil-packet";

// Complexity levels for recipes
export type MealComplexity = "easy" | "moderate" | "advanced";

// Dietary restriction tags
export type DietaryTag = 
  | "vegetarian" 
  | "vegan" 
  | "gluten-free" 
  | "dairy-free" 
  | "nut-free";

// Storage requirements for ingredients
export type StorageRequirement = "none" | "cooler" | "refrigeration";

// Ingredient categories for shopping list organization
export type IngredientCategory = 
  | "protein"
  | "produce"
  | "dairy"
  | "grains"
  | "canned"
  | "condiments"
  | "spices"
  | "snacks"
  | "beverages";

// Individual ingredient with structured data
export interface MealIngredient {
  item: string;
  quantity: number;
  unit: string;
  category: IngredientCategory;
  optional?: boolean;
  prepAhead?: boolean; // Can prep at home
}

// Comprehensive meal suggestion with all metadata
export interface MealSuggestion {
  id: string;
  name: string;
  /** @deprecated Use mealTypes instead. Kept for backward compat. */
  mealType: "breakfast" | "lunch" | "dinner" | "snacks";
  /** 
   * Array of meal types this recipe is suitable for.
   * Most recipes have 1, some can have 2 (e.g., "Breakfast Burritos" = breakfast + lunch).
   * Required for new recipes. Legacy recipes will have this inferred.
   */
  mealTypes?: ("breakfast" | "lunch" | "dinner" | "snacks")[];
  description?: string;
  complexity: MealComplexity;
  cookingMethods: CookingMethod[];
  prepTime: number; // minutes
  cookTime: number; // minutes
  servings: number;
  storage: StorageRequirement;
  dietaryTags: DietaryTag[];
  ingredients: MealIngredient[];
  instructions?: string[];
  prepAhead?: string; // Tips for prep at home
  weatherBackup?: string; // Alternative if weather is bad
  popularityScore?: number; // For sorting by popularity
  useCount?: number; // How many times user has used this
}

// Enhanced meal entry for a day's meal plan
export interface MealEntry {
  text: string;
  suggestionId?: string; // Link to suggestion if used
  customIngredients?: MealIngredient[];
  recipe?: string;
  prepNotes?: string;
  assignedTo?: string; // Who's cooking
  completed?: boolean;
  rating?: number; // Post-trip rating 1-5
  notes?: string; // Post-trip notes
}

// A complete day's meal plan
export interface EnhancedMeal {
  day: number;
  breakfast?: MealEntry;
  lunch?: MealEntry;
  dinner?: MealEntry;
  snacks?: MealEntry;
}

// Reusable meal plan template
export interface MealTemplate {
  id: string;
  name: string;
  description?: string;
  days: number;
  meals: EnhancedMeal[];
  timesUsed: number;
  lastUsed?: string;
  createdAt: string;
  tags?: string[];
}

// Shopping list item with structured data
export interface ShoppingListItem {
  id: string;
  item: string;
  quantity: number;
  unit: string;
  category: IngredientCategory;
  checked: boolean;
  source: string; // Which meal(s) this is for
  optional?: boolean;
}

// Stats for a meal plan
export interface MealPlanStats {
  totalMealsPlanned: number;
  completionPercentage: number;
  averageComplexity: MealComplexity;
  cookingMethodsNeeded: CookingMethod[];
  estimatedTotalPrepTime: number;
  estimatedTotalCookTime: number;
}

// Quick-start template info
export interface QuickStartTemplate {
  id: string;
  name: string;
  description: string;
  days: number;
  icon: string;
}

// Labels and icons for cooking methods
export const COOKING_METHOD_LABELS: Record<CookingMethod, string> = {
  "campfire": "Campfire",
  "camp-stove": "Camp Stove",
  "no-cook": "No Cook",
  "grill": "Grill",
  "dutch-oven": "Dutch Oven",
  "foil-packet": "Foil Packet",
};

export const COOKING_METHOD_ICONS: Record<CookingMethod, string> = {
  "campfire": "🔥",
  "camp-stove": "🍳",
  "no-cook": "✋",
  "grill": "🍖",
  "dutch-oven": "🍲",
  "foil-packet": "📦",
};

// Labels for complexity levels
export const COMPLEXITY_LABELS: Record<MealComplexity, string> = {
  easy: "Easy",
  moderate: "Moderate",
  advanced: "Advanced",
};

export const COMPLEXITY_ICONS: Record<MealComplexity, string> = {
  easy: "🔥",
  moderate: "🔥🔥",
  advanced: "🔥🔥🔥",
};

// Labels for dietary tags
export const DIETARY_TAG_LABELS: Record<DietaryTag, string> = {
  "vegetarian": "Vegetarian",
  "vegan": "Vegan",
  "gluten-free": "Gluten-Free",
  "dairy-free": "Dairy-Free",
  "nut-free": "Nut-Free",
};

// Labels for ingredient categories (for shopping list headers)
export const CATEGORY_LABELS: Record<IngredientCategory, string> = {
  protein: "Protein",
  produce: "Produce",
  dairy: "Dairy",
  grains: "Grains & Bread",
  canned: "Canned Goods",
  condiments: "Condiments",
  spices: "Spices & Seasonings",
  snacks: "Snacks",
  beverages: "Beverages",
};

// Order for displaying categories in shopping list (store navigation order)
export const CATEGORY_ORDER: IngredientCategory[] = [
  "produce",
  "protein",
  "dairy",
  "grains",
  "canned",
  "condiments",
  "spices",
  "snacks",
  "beverages",
];
