/**
 * Local AsyncStorage service for meal planning
 * Provides offline meal planning when Firebase is unavailable
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { Meal, MealCategory } from "../types/meal";

const MEALS_STORAGE_KEY = "@meals_";

/**
 * Get storage key for trip meals
 */
function getMealsKey(tripId: string): string {
  return `${MEALS_STORAGE_KEY}${tripId}`;
}

/**
 * Get all meals for a trip
 */
export async function getTripMeals(tripId: string): Promise<Meal[]> {
  try {
    const key = getMealsKey(tripId);
    const data = await AsyncStorage.getItem(key);
    if (!data) return [];
    return JSON.parse(data) as Meal[];
  } catch (error) {
    console.error("Error loading meals from local storage:", error);
    return [];
  }
}

/**
 * Add a meal to a trip
 */
export async function addMeal(
  tripId: string,
  mealData: Omit<Meal, "id" | "tripId" | "createdAt" | "updatedAt">
): Promise<string> {
  try {
    const meals = await getTripMeals(tripId);
    const now = new Date().toISOString();
    const newMeal: Meal = {
      ...mealData,
      id: `meal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      tripId,
      createdAt: now,
      updatedAt: now,
    };

    meals.push(newMeal);
    await AsyncStorage.setItem(getMealsKey(tripId), JSON.stringify(meals));
    return newMeal.id;
  } catch (error) {
    console.error("Error adding meal to local storage:", error);
    throw error;
  }
}

/**
 * Update a meal
 */
export async function updateMeal(
  tripId: string,
  mealId: string,
  updates: Partial<Meal>
): Promise<void> {
  try {
    const meals = await getTripMeals(tripId);
    const index = meals.findIndex((m) => m.id === mealId);

    if (index === -1) {
      throw new Error("Meal not found");
    }

    meals[index] = {
      ...meals[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await AsyncStorage.setItem(getMealsKey(tripId), JSON.stringify(meals));
  } catch (error) {
    console.error("Error updating meal in local storage:", error);
    throw error;
  }
}

/**
 * Delete a meal
 */
export async function deleteMeal(tripId: string, mealId: string): Promise<void> {
  try {
    const meals = await getTripMeals(tripId);
    const filtered = meals.filter((m) => m.id !== mealId);
    await AsyncStorage.setItem(getMealsKey(tripId), JSON.stringify(filtered));
  } catch (error) {
    console.error("Error deleting meal from local storage:", error);
    throw error;
  }
}

/**
 * Get meals for a specific day and category
 */
export async function getMealsByDayAndCategory(
  tripId: string,
  dayIndex: number,
  category?: MealCategory
): Promise<Meal[]> {
  try {
    const meals = await getTripMeals(tripId);
    return meals.filter((m) => {
      if (m.dayIndex !== dayIndex) return false;
      if (category && m.category !== category) return false;
      return true;
    });
  } catch (error) {
    console.error("Error getting meals by day/category:", error);
    return [];
  }
}

/**
 * Get meal statistics for a trip
 */
export async function getMealStats(
  tripId: string,
  totalDays: number
): Promise<{
  breakfast: number;
  lunch: number;
  dinner: number;
  snack: number;
  total: number;
  possibleMeals: number;
}> {
  try {
    const meals = await getTripMeals(tripId);

    return {
      breakfast: meals.filter((m) => m.category === "breakfast").length,
      lunch: meals.filter((m) => m.category === "lunch").length,
      dinner: meals.filter((m) => m.category === "dinner").length,
      snack: meals.filter((m) => m.category === "snack").length,
      total: meals.length,
      possibleMeals: totalDays * 3, // 3 main meals per day
    };
  } catch (error) {
    console.error("Error calculating meal stats:", error);
    return {
      breakfast: 0,
      lunch: 0,
      dinner: 0,
      snack: 0,
      total: 0,
      possibleMeals: totalDays * 3,
    };
  }
}

/**
 * Clear all meals for a trip
 */
export async function clearTripMeals(tripId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(getMealsKey(tripId));
  } catch (error) {
    console.error("Error clearing trip meals:", error);
    throw error;
  }
}
