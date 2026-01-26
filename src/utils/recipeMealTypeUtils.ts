/**
 * Recipe Meal Type Utils
 * 
 * Utilities for getting and normalizing mealTypes on recipes,
 * with fallback inference for legacy data.
 */

import { MealType, inferMealTypes, mealCategoryToMealType } from "../constants/mealTypes";
import { MealSuggestion } from "../types/meals";
import { MealLibraryItem } from "../types/meal";

/**
 * Get the mealTypes for a MealSuggestion, with fallback inference.
 * 
 * Priority:
 * 1. Use mealTypes if explicitly set
 * 2. Infer from mealType field (legacy singular)
 * 3. Infer from name/description keywords
 */
export function getRecipeMealTypes(recipe: MealSuggestion): MealType[] {
  // 1. Explicit mealTypes array
  if (recipe.mealTypes && recipe.mealTypes.length > 0) {
    return recipe.mealTypes;
  }

  // 2. Convert legacy mealType to array
  if (recipe.mealType) {
    return [recipe.mealType];
  }

  // 3. Infer from name/description
  return inferMealTypes(recipe.name, recipe.description);
}

/**
 * Get the mealTypes for a MealLibraryItem, with fallback inference.
 * 
 * Priority:
 * 1. Use mealTypes if explicitly set
 * 2. Convert category field to mealType
 * 3. Infer from name/ingredients keywords
 */
export function getLibraryItemMealTypes(item: MealLibraryItem): MealType[] {
  // 1. Explicit mealTypes array
  if (item.mealTypes && item.mealTypes.length > 0) {
    return item.mealTypes;
  }

  // 2. Convert legacy category to mealType
  if (item.category) {
    return [mealCategoryToMealType(item.category)];
  }

  // 3. Infer from name
  return inferMealTypes(item.name, item.instructions, item.category);
}

/**
 * Check if a recipe matches a given meal type filter.
 * 
 * @param recipe - The recipe to check
 * @param filterType - The meal type to filter by, or "all" for no filter
 * @returns true if recipe matches the filter
 */
export function recipeMatchesMealType(
  recipe: MealSuggestion,
  filterType: MealType | "all"
): boolean {
  if (filterType === "all") return true;

  const mealTypes = getRecipeMealTypes(recipe);
  return mealTypes.includes(filterType);
}

/**
 * Check if a library item matches a given meal type filter.
 * 
 * @param item - The library item to check
 * @param filterType - The meal type to filter by, or "all" for no filter
 * @returns true if item matches the filter
 */
export function libraryItemMatchesMealType(
  item: MealLibraryItem,
  filterType: MealType | "all"
): boolean {
  if (filterType === "all") return true;

  const mealTypes = getLibraryItemMealTypes(item);
  return mealTypes.includes(filterType);
}

/**
 * Normalize and validate mealTypes array.
 * Ensures we have at least 1, at most 2, and all valid types.
 * 
 * @param mealTypes - Input array (may be undefined or empty)
 * @param fallbackName - Recipe name for inference fallback
 * @returns Validated mealTypes array
 */
export function normalizeMealTypes(
  mealTypes: MealType[] | undefined,
  fallbackName: string
): MealType[] {
  // Validate existing types
  const validTypes = ["breakfast", "lunch", "dinner", "snacks"] as const;
  const validated = (mealTypes || []).filter(
    (t): t is MealType => validTypes.includes(t as any)
  );

  // If empty, infer
  if (validated.length === 0) {
    return inferMealTypes(fallbackName);
  }

  // Limit to 2
  return validated.slice(0, 2);
}

/**
 * Get display label for mealTypes array.
 * E.g., ["breakfast", "lunch"] -> "Breakfast, Lunch"
 */
export function formatMealTypesLabel(mealTypes: MealType[]): string {
  if (!mealTypes || mealTypes.length === 0) return "Dinner";

  return mealTypes
    .map((t) => t.charAt(0).toUpperCase() + t.slice(1))
    .join(", ");
}
