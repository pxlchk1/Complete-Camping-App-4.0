/**
 * Meal Suggestion Service
 * Generates contextual meal suggestions based on trip type, season, and prep capabilities
 * Enhanced with comprehensive camping meal database
 */

import { MealCategory, MealLibraryItem, PrepType, SuggestibleMealCategory } from "../types/meal";
import { MealIngredient } from "../types/meals";
import { getMealLibrary } from "./mealsService";
import { useMealStore } from "../state/mealStore";
import { 
  ENHANCED_MEAL_SUGGESTIONS, 
  filterSuggestions, 
  getQuickMeals,
  getNoCookMeals,
  getTopSuggestions,
} from "../data/mealSuggestions";
import { MealSuggestion as EnhancedMealSuggestion } from "../types/meals";
import { CookingMethod, MealComplexity } from "../types/meals";

export interface MealSuggestion {
  id: string;
  name: string;
  type: "recipe" | "idea";
  recipeId?: string;
  category: MealCategory;
  prepType: PrepType;
  ingredients?: string[];
  description?: string;
  tags?: string[]; // Tags for filtering (quick, no-cook, one-pot, vegetarian, etc.)
  // Enhanced properties from new data
  complexity?: MealComplexity;
  cookingMethods?: CookingMethod[];
  prepTime?: number;
  cookTime?: number;
  servings?: number;
  dietaryTags?: string[];
  prepAhead?: string;
}

export interface SuggestionContext {
  tripType?: string; // "car_camping", "backpacking", "rv", etc.
  season?: string; // "summer", "winter", "spring", "fall"
  partySize?: number;
  hasCampfire?: boolean;
  hasStove?: boolean;
}

/**
 * Convert cooking methods to PrepType
 */
function cookingMethodToPrepType(methods: CookingMethod[]): PrepType {
  if (methods.includes("no-cook")) return "noCook";
  if (methods.includes("campfire")) return "campfire";
  if (methods.includes("camp-stove") || methods.includes("grill")) return "campStove";
  // dutch-oven and foil-packet are campfire variants
  if (methods.includes("dutch-oven") || methods.includes("foil-packet")) return "campfire";
  return "noCook";
}

/**
 * Convert enhanced suggestion to standard MealSuggestion format
 */
function enhancedToStandard(enhanced: EnhancedMealSuggestion): MealSuggestion {
  // Map mealType to category
  const categoryMap: Record<string, MealCategory> = {
    breakfast: "breakfast",
    lunch: "lunch",
    dinner: "dinner",
    snacks: "snack",
  };

  return {
    id: enhanced.id,
    name: enhanced.name,
    type: "idea",
    category: categoryMap[enhanced.mealType] || "snack",
    prepType: cookingMethodToPrepType(enhanced.cookingMethods),
    ingredients: enhanced.ingredients.map((i: MealIngredient) => 
      i.quantity ? `${i.quantity} ${i.unit || ""} ${i.item}`.trim() : i.item
    ),
    description: enhanced.description,
    tags: [
      ...enhanced.dietaryTags,
      ...(enhanced.complexity === "easy" ? ["quick"] : []),
      ...(enhanced.cookingMethods.includes("no-cook") ? ["no-cook"] : []),
      ...(enhanced.cookingMethods.length === 1 ? ["one-pot"] : []),
      ...(enhanced.prepAhead ? ["prep-ahead"] : []),
    ],
    complexity: enhanced.complexity,
    cookingMethods: enhanced.cookingMethods,
    prepTime: enhanced.prepTime,
    cookTime: enhanced.cookTime,
    servings: enhanced.servings,
    dietaryTags: enhanced.dietaryTags,
    prepAhead: enhanced.prepAhead,
  };
}

// Quick ideas that aren't full recipes (for variety)
const QUICK_IDEAS: Record<SuggestibleMealCategory, MealSuggestion[]> = {
  breakfast: [
    { id: "idea_b1", name: "Trail mix and coffee", type: "idea", category: "breakfast", prepType: "noCook", description: "Quick and energizing start" },
    { id: "idea_b2", name: "Instant oatmeal with dried fruit", type: "idea", category: "breakfast", prepType: "campStove", description: "Hot and filling" },
    { id: "idea_b3", name: "Granola bars and fresh fruit", type: "idea", category: "breakfast", prepType: "noCook", description: "Light and portable" },
  ],
  lunch: [
    { id: "idea_l1", name: "Tortillas with tuna and avocado", type: "idea", category: "lunch", prepType: "noCook", description: "Protein-packed wrap" },
    { id: "idea_l2", name: "Trail lunch: cheese, crackers, and salami", type: "idea", category: "lunch", prepType: "noCook", description: "Easy hiking lunch" },
    { id: "idea_l3", name: "Peanut butter and banana wraps", type: "idea", category: "lunch", prepType: "noCook", description: "Kid-friendly favorite" },
  ],
  dinner: [
    { id: "idea_d1", name: "Foil packet salmon + potatoes", type: "idea", category: "dinner", prepType: "campfire", description: "Elegant campfire meal" },
    { id: "idea_d2", name: "Campfire quesadillas with beans", type: "idea", category: "dinner", prepType: "campfire", description: "Quick and customizable" },
    { id: "idea_d3", name: "One-pot rice and beans", type: "idea", category: "dinner", prepType: "campStove", description: "Hearty and filling" },
  ],
  snack: [
    { id: "idea_s1", name: "S'mores", type: "idea", category: "snack", prepType: "campfire", description: "Classic campfire treat" },
    { id: "idea_s2", name: "Apple slices with almond butter", type: "idea", category: "snack", prepType: "noCook", description: "Healthy afternoon snack" },
    { id: "idea_s3", name: "Popcorn cooked over fire", type: "idea", category: "snack", prepType: "campfire", description: "Fun and shareable" },
  ],
};

/**
 * Get prep types suitable for the context
 */
function getSuitablePrepTypes(context: SuggestionContext): PrepType[] {
  const types: PrepType[] = ["noCook", "cold"];
  
  if (context.hasStove !== false) {
    types.push("campStove");
  }
  
  if (context.hasCampfire !== false) {
    types.push("campfire");
  }
  
  // Backpacking = prefer no-cook and camp stove
  if (context.tripType === "backpacking" || context.tripType === "bikepacking") {
    return ["noCook", "campStove"];
  }
  
  return types;
}

/**
 * Convert library item to suggestion
 */
function libraryToSuggestion(item: MealLibraryItem): MealSuggestion {
  return {
    id: `recipe_${item.id}`,
    name: item.name,
    type: "recipe",
    recipeId: item.id,
    category: item.category,
    prepType: item.prepType,
    ingredients: item.ingredients,
    description: item.instructions?.substring(0, 100) || undefined,
  };
}

/**
 * Get suggestions for a specific meal category
 * Returns a mixed pool of enhanced suggestions, library recipes, and quick ideas
 * Shuffles ALL sources together for true variety on each shuffle
 */
export async function getSuggestionsForCategory(
  category: SuggestibleMealCategory,
  context: SuggestionContext = {},
  count: number = 3
): Promise<MealSuggestion[]> {
  const suitablePrepTypes = getSuitablePrepTypes(context);
  
  // Map category to mealType for enhanced suggestions
  const mealTypeMap: Record<SuggestibleMealCategory, "breakfast" | "lunch" | "dinner" | "snacks"> = {
    breakfast: "breakfast",
    lunch: "lunch",
    dinner: "dinner",
    snack: "snacks",
  };
  const mealType = mealTypeMap[category];
  
  // Build a combined pool from ALL sources, then shuffle and pick
  const combinedPool: MealSuggestion[] = [];
  const seenNames = new Set<string>();
  
  // Helper to add without duplicates
  const addIfUnique = (suggestion: MealSuggestion) => {
    const key = suggestion.name.toLowerCase();
    if (!seenNames.has(key)) {
      seenNames.add(key);
      combinedPool.push(suggestion);
    }
  };
  
  // 1. Enhanced suggestions from our comprehensive database (static)
  const enhancedSuggestions = ENHANCED_MEAL_SUGGESTIONS
    .filter(s => s.mealType === mealType)
    .filter(s => {
      // Filter by cooking methods based on context
      if (context.tripType === "backpacking" || context.tripType === "bikepacking") {
        return s.cookingMethods.some(m => m === "no-cook" || m === "camp-stove");
      }
      if (context.hasCampfire === false) {
        return !s.cookingMethods.includes("campfire");
      }
      if (context.hasStove === false) {
        return !s.cookingMethods.includes("camp-stove");
      }
      return true;
    })
    .map(enhancedToStandard);
  
  enhancedSuggestions.forEach(addIfUnique);
  
  // 2. Library recipes (user's saved recipes from Firebase) - load ALL suitable ones
  try {
    const libraryMeals = await getMealLibrary(category);
    const suitableLibraryMeals = libraryMeals.filter((meal) => {
      if (!suitablePrepTypes.includes(meal.prepType)) return false;
      
      if (context.tripType && meal.suitableFor) {
        const normalizedTripType = context.tripType.replace("_", " ").toLowerCase();
        const hasSuitable = meal.suitableFor.some(
          (s) => s.toLowerCase().includes(normalizedTripType) || s.toLowerCase() === "all"
        );
        if (!hasSuitable) return false;
      }
      return true;
    });
    
    suitableLibraryMeals.map(libraryToSuggestion).forEach(addIfUnique);
  } catch {
    // Firebase unavailable, continue with what we have
  }
  
  // 3. Quick ideas as additional variety
  const ideas = QUICK_IDEAS[category].filter((idea) => {
    return suitablePrepTypes.includes(idea.prepType);
  });
  ideas.forEach(addIfUnique);
  
  // Shuffle the entire combined pool for true randomness
  const shuffled = combinedPool.sort(() => Math.random() - 0.5);
  
  // Return requested count
  return shuffled.slice(0, count);
}

/**
 * Get a single quick suggestion for a meal slot
 * Used for one-tap "Suggest" button
 */
export async function getQuickSuggestion(
  category: SuggestibleMealCategory,
  context: SuggestionContext = {},
  excludeNames: string[] = []
): Promise<MealSuggestion | null> {
  const suggestions = await getSuggestionsForCategory(category, context, 5);
  
  // Filter out already used meals
  const available = suggestions.filter(
    (s) => !excludeNames.some((name) => name.toLowerCase() === s.name.toLowerCase())
  );
  
  if (available.length === 0) {
    // Return any suggestion if all are used
    return suggestions[0] || null;
  }
  
  return available[Math.floor(Math.random() * available.length)];
}

/**
 * Auto-fill all meal slots for a day
 * Returns suggestions for breakfast, lunch, dinner, and snack
 */
export async function getAutoFillSuggestions(
  context: SuggestionContext = {},
  excludeNames: string[] = []
): Promise<Record<SuggestibleMealCategory, MealSuggestion | null>> {
  const categories: SuggestibleMealCategory[] = ["breakfast", "lunch", "dinner", "snack"];
  const result: Record<SuggestibleMealCategory, MealSuggestion | null> = {
    breakfast: null,
    lunch: null,
    dinner: null,
    snack: null,
  };
  
  const usedNames = [...excludeNames];
  
  for (const category of categories) {
    const suggestion = await getQuickSuggestion(category, context, usedNames);
    result[category] = suggestion;
    if (suggestion) {
      usedNames.push(suggestion.name);
    }
  }
  
  return result;
}

/**
 * Get shopping list items from suggestions
 */
export function getIngredientsFromSuggestions(suggestions: MealSuggestion[]): string[] {
  const ingredients: string[] = [];
  
  for (const suggestion of suggestions) {
    if (suggestion.ingredients) {
      ingredients.push(...suggestion.ingredients);
    }
  }
  
  // Remove duplicates
  return [...new Set(ingredients)];
}

/**
 * Get quick meal suggestions (under 15 minutes total time)
 */
export function getQuickMealSuggestions(
  category: SuggestibleMealCategory,
  count: number = 5
): MealSuggestion[] {
  const mealTypeMap: Record<SuggestibleMealCategory, "breakfast" | "lunch" | "dinner" | "snacks"> = {
    breakfast: "breakfast",
    lunch: "lunch",
    dinner: "dinner",
    snack: "snacks",
  };
  
  const quickMeals = getQuickMeals(mealTypeMap[category])
    .slice(0, count)
    .map(enhancedToStandard);
  
  return quickMeals;
}

/**
 * Get no-cook meal suggestions (great for hot days or minimal gear)
 */
export function getNoCookSuggestions(
  category: SuggestibleMealCategory,
  count: number = 5
): MealSuggestion[] {
  const mealTypeMap: Record<SuggestibleMealCategory, "breakfast" | "lunch" | "dinner" | "snacks"> = {
    breakfast: "breakfast",
    lunch: "lunch",
    dinner: "dinner",
    snack: "snacks",
  };
  
  const noCookMeals = getNoCookMeals()
    .filter(m => m.mealType === mealTypeMap[category])
    .slice(0, count)
    .map(enhancedToStandard);
  
  return noCookMeals;
}

/**
 * Get top-rated suggestions for a category
 */
export function getTopRatedSuggestions(
  category: SuggestibleMealCategory,
  count: number = 5
): MealSuggestion[] {
  const mealTypeMap: Record<SuggestibleMealCategory, "breakfast" | "lunch" | "dinner" | "snacks"> = {
    breakfast: "breakfast",
    lunch: "lunch",
    dinner: "dinner",
    snack: "snacks",
  };
  
  const topMeals = getTopSuggestions(mealTypeMap[category], count)
    .map(enhancedToStandard);
  
  return topMeals;
}

/**
 * Get all enhanced suggestions for a category (for browsing)
 */
export function getAllEnhancedSuggestions(
  category: SuggestibleMealCategory
): MealSuggestion[] {
  const mealTypeMap: Record<SuggestibleMealCategory, "breakfast" | "lunch" | "dinner" | "snacks"> = {
    breakfast: "breakfast",
    lunch: "lunch", 
    dinner: "dinner",
    snack: "snacks",
  };
  
  return ENHANCED_MEAL_SUGGESTIONS
    .filter(s => s.mealType === mealTypeMap[category])
    .map(enhancedToStandard);
}
