// Meal planning types for Firebase-based data model

export type MealCategory = "breakfast" | "lunch" | "dinner" | "snack" | "beverages";
// Meal categories that have recipes/suggestions (excludes beverages which is a checklist)
export type SuggestibleMealCategory = "breakfast" | "lunch" | "dinner" | "snack";
export type PrepType = "cold" | "campStove" | "campfire" | "noCook";
export type Difficulty = "easy" | "moderate";

export interface Meal {
  id: string;
  tripId: string;
  name: string;
  category: MealCategory;
  dayIndex: number; // 1-based day number
  sourceType: "library" | "custom";
  libraryId?: string; // Reference to /mealLibrary/{mealId}
  prepType: PrepType;
  ingredients?: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MealLibraryItem {
  id: string;
  name: string;
  /** @deprecated Use mealTypes instead. Kept for backward compat. */
  category: MealCategory;
  /** 
   * Array of meal types this recipe is suitable for.
   * Most recipes have 1, some can have 2.
   * Legacy recipes will have this inferred from category.
   */
  mealTypes?: ("breakfast" | "lunch" | "dinner" | "snacks")[];
  prepType: PrepType;
  difficulty: Difficulty;
  suitableFor?: string[]; // Array of camping styles
  ingredients: string[];
  instructions?: string;
  tags?: string[];
  createdAt: string;
}

export interface UserMeal {
  id: string;
  userId: string;
  name: string;
  category: MealCategory;
  prepType: PrepType;
  ingredients: string[];
  instructions?: string;
  createdAt: string;
  updatedAt: string;
}
