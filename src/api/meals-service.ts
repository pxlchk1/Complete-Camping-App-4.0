/**
 * Firebase service for meal planning
 * Structure:
 * - /users/{userId}/trips/{tripId}/meals/{mealId}
 * - /mealLibrary/{mealId} (global, read-only)
 * - /users/{userId}/userMeals/{mealId} (user custom meals)
 */

import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  writeBatch,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { Meal, MealLibraryItem } from "../types/camping";

/**
 * Get all meals for a trip
 */
export async function getTripMeals(userId: string, tripId: string): Promise<Meal[]> {
  try {
    const mealsRef = collection(db, "users", userId, "trips", tripId, "meals");
    const q = query(mealsRef, orderBy("dayIndex"), orderBy("category"));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Meal[];
  } catch (error) {
    console.error("Error fetching trip meals:", error);
    return [];
  }
}

/**
 * Add a meal to a trip
 */
export async function addTripMeal(
  userId: string,
  tripId: string,
  meal: Omit<Meal, "id">
): Promise<string> {
  try {
    const mealsRef = collection(db, "users", userId, "trips", tripId, "meals");
    const newMealRef = doc(mealsRef);

    await setDoc(newMealRef, meal);
    return newMealRef.id;
  } catch (error) {
    console.error("Error adding meal:", error);
    throw error;
  }
}

/**
 * Update a meal
 */
export async function updateTripMeal(
  userId: string,
  tripId: string,
  mealId: string,
  updates: Partial<Meal>
): Promise<void> {
  try {
    const mealRef = doc(db, "users", userId, "trips", tripId, "meals", mealId);
    await updateDoc(mealRef, updates);
  } catch (error) {
    console.error("Error updating meal:", error);
    throw error;
  }
}

/**
 * Delete a meal
 */
export async function deleteTripMeal(
  userId: string,
  tripId: string,
  mealId: string
): Promise<void> {
  try {
    const mealRef = doc(db, "users", userId, "trips", tripId, "meals", mealId);
    await deleteDoc(mealRef);
  } catch (error) {
    console.error("Error deleting meal:", error);
    throw error;
  }
}

/**
 * Get meals from the global meal library
 */
export async function getMealLibrary(
  category?: "breakfast" | "lunch" | "dinner" | "snack",
  filters?: {
    prepType?: string;
    difficulty?: "easy" | "moderate";
  }
): Promise<MealLibraryItem[]> {
  try {
    const libraryRef = collection(db, "mealLibrary");
    let q = query(libraryRef);

    if (category) {
      q = query(q, where("category", "==", category));
    }

    if (filters?.difficulty) {
      q = query(q, where("difficulty", "==", filters.difficulty));
    }

    if (filters?.prepType) {
      q = query(q, where("prepType", "==", filters.prepType));
    }

    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as MealLibraryItem[];
  } catch (error) {
    console.error("Error fetching meal library:", error);
    return [];
  }
}

/**
 * Get user custom meals
 */
export async function getUserMeals(userId: string): Promise<MealLibraryItem[]> {
  try {
    const mealsRef = collection(db, "users", userId, "userMeals");
    const snapshot = await getDocs(mealsRef);

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as MealLibraryItem[];
  } catch (error) {
    console.error("Error fetching user meals:", error);
    return [];
  }
}

/**
 * Save a custom meal to user library
 */
export async function saveUserMeal(
  userId: string,
  meal: Omit<MealLibraryItem, "id">
): Promise<string> {
  try {
    const mealsRef = collection(db, "users", userId, "userMeals");
    const newMealRef = doc(mealsRef);

    await setDoc(newMealRef, meal);
    return newMealRef.id;
  } catch (error) {
    console.error("Error saving user meal:", error);
    throw error;
  }
}

/**
 * Add meal ingredients to packing list
 */
export async function addIngredientsToPackingList(
  userId: string,
  tripId: string,
  ingredients: string[]
): Promise<void> {
  try {
    const packingRef = collection(db, "users", userId, "trips", tripId, "packingList");
    const batch = writeBatch(db);

    // Check existing items to avoid duplicates
    const existingSnapshot = await getDocs(packingRef);
    const existingItems = new Map(
      existingSnapshot.docs.map((doc) => [doc.data().label?.toLowerCase(), doc])
    );

    ingredients.forEach((ingredient) => {
      const normalized = ingredient.toLowerCase().trim();
      const existing = existingItems.get(normalized);

      if (existing) {
        // Increment quantity if exists
        const currentQuantity = existing.data().quantity || 1;
        batch.update(existing.ref, { quantity: currentQuantity + 1 });
      } else {
        // Create new item
        const newItemRef = doc(packingRef);
        batch.set(newItemRef, {
          category: "Food and Kitchen",
          label: ingredient,
          quantity: 1,
          isPacked: false,
          isAutoGenerated: false,
        });
      }
    });

    await batch.commit();
  } catch (error) {
    console.error("Error adding ingredients to packing list:", error);
    throw error;
  }
}
