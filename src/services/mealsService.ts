import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  writeBatch,
  limit,
} from "firebase/firestore";
import { db } from "../config/firebase";
import type { Meal, MealLibraryItem, MealCategory, UserMeal } from "../types/meal";

const USERS_COLLECTION = "users";
const MEAL_LIBRARY_COLLECTION = "mealLibrary";

/**
 * Get meals collection reference for a trip
 */
function getMealsCollection(userId: string, tripId: string) {
  return collection(db, USERS_COLLECTION, userId, "trips", tripId, "meals");
}

/**
 * Get user meals collection reference
 */
function getUserMealsCollection(userId: string) {
  return collection(db, USERS_COLLECTION, userId, "userMeals");
}

/**
 * Add a meal to a trip
 */
export async function addMeal(
  userId: string,
  tripId: string,
  mealData: Omit<Meal, "id" | "tripId" | "createdAt" | "updatedAt">
): Promise<string> {
  const mealsRef = getMealsCollection(userId, tripId);
  const now = new Date().toISOString();

  const newMeal = {
    ...mealData,
    tripId,
    createdAt: now,
    updatedAt: now,
  };

  const docRef = await addDoc(mealsRef, newMeal);
  return docRef.id;
}

/**
 * Get all meals for a trip
 */
export async function getTripMeals(userId: string, tripId: string): Promise<Meal[]> {
  const mealsRef = getMealsCollection(userId, tripId);
  const q = query(mealsRef, orderBy("dayIndex"), orderBy("category"));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Meal[];
}

/**
 * Get meals for a specific day and category
 */
export async function getMealsByDayAndCategory(
  userId: string,
  tripId: string,
  dayIndex: number,
  category?: MealCategory
): Promise<Meal[]> {
  const mealsRef = getMealsCollection(userId, tripId);
  let q = query(mealsRef, where("dayIndex", "==", dayIndex));

  if (category) {
    q = query(q, where("category", "==", category));
  }

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Meal[];
}

/**
 * Update a meal
 */
export async function updateMeal(
  userId: string,
  tripId: string,
  mealId: string,
  updates: Partial<Meal>
): Promise<void> {
  const mealRef = doc(db, USERS_COLLECTION, userId, "trips", tripId, "meals", mealId);
  await updateDoc(mealRef, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Delete a meal
 */
export async function deleteMeal(
  userId: string,
  tripId: string,
  mealId: string
): Promise<void> {
  const mealRef = doc(db, USERS_COLLECTION, userId, "trips", tripId, "meals", mealId);
  await deleteDoc(mealRef);
}

/**
 * Get meals from library
 */
export async function getMealLibrary(
  category?: MealCategory,
  prepType?: string,
  difficulty?: string
): Promise<MealLibraryItem[]> {
  let q = query(collection(db, MEAL_LIBRARY_COLLECTION), orderBy("name"));

  if (category) {
    q = query(q, where("category", "==", category));
  }
  if (prepType) {
    q = query(q, where("prepType", "==", prepType));
  }
  if (difficulty) {
    q = query(q, where("difficulty", "==", difficulty));
  }

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as MealLibraryItem[];
}

/**
 * Get a single meal from library
 */
export async function getMealFromLibrary(mealId: string): Promise<MealLibraryItem | null> {
  const mealRef = doc(db, MEAL_LIBRARY_COLLECTION, mealId);
  const mealDoc = await getDoc(mealRef);

  if (!mealDoc.exists()) {
    return null;
  }

  return {
    id: mealDoc.id,
    ...mealDoc.data(),
  } as MealLibraryItem;
}

/**
 * Add a meal from library to trip
 */
export async function addMealFromLibrary(
  userId: string,
  tripId: string,
  libraryMealId: string,
  dayIndex: number
): Promise<string> {
  const libraryMeal = await getMealFromLibrary(libraryMealId);

  if (!libraryMeal) {
    throw new Error("Meal not found in library");
  }

  return await addMeal(userId, tripId, {
    name: libraryMeal.name,
    category: libraryMeal.category,
    dayIndex,
    sourceType: "library",
    libraryId: libraryMealId,
    prepType: libraryMeal.prepType,
    ingredients: libraryMeal.ingredients,
    notes: libraryMeal.instructions,
  });
}

/**
 * Save a custom meal to user's personal library
 */
export async function saveToUserMeals(
  userId: string,
  mealData: Omit<UserMeal, "id" | "userId" | "createdAt" | "updatedAt">
): Promise<string> {
  const userMealsRef = getUserMealsCollection(userId);
  const now = new Date().toISOString();

  const newUserMeal = {
    ...mealData,
    userId,
    createdAt: now,
    updatedAt: now,
  };

  const docRef = await addDoc(userMealsRef, newUserMeal);
  return docRef.id;
}

/**
 * Get user's custom meals
 */
export async function getUserMeals(userId: string): Promise<UserMeal[]> {
  const userMealsRef = getUserMealsCollection(userId);
  const q = query(userMealsRef, orderBy("name"));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as UserMeal[];
}

/**
 * Add meal ingredients to packing list
 */
export async function addIngredientsToPackingList(
  userId: string,
  tripId: string,
  ingredients: string[]
): Promise<void> {
  const { addPackingItem, getPackingList } = await import("./packingListService");

  const existingItems = await getPackingList(userId, tripId);
  const batch = writeBatch(db);

  for (const ingredient of ingredients) {
    // Check if ingredient already exists in packing list
    const existing = existingItems.find(
      (item) => item.label.toLowerCase() === ingredient.toLowerCase() && item.category === "Food and kitchen"
    );

    if (existing) {
      // Increment quantity
      const itemRef = doc(db, USERS_COLLECTION, userId, "trips", tripId, "packingList", existing.id);
      batch.update(itemRef, {
        quantity: existing.quantity + 1,
        updatedAt: new Date().toISOString(),
      });
    } else {
      // Add new item
      const packingRef = collection(db, USERS_COLLECTION, userId, "trips", tripId, "packingList");
      const newItemRef = doc(packingRef);
      batch.set(newItemRef, {
        category: "Food and kitchen",
        label: ingredient,
        quantity: 1,
        isPacked: false,
        isAutoGenerated: false,
        notes: "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  }

  await batch.commit();
}

/**
 * Subscribe to real-time meal updates for a trip
 */
export function subscribeToTripMeals(
  userId: string,
  tripId: string,
  callback: (meals: Meal[]) => void
): () => void {
  const mealsRef = getMealsCollection(userId, tripId);
  const q = query(mealsRef, orderBy("dayIndex"), orderBy("category"));

  return onSnapshot(q, (snapshot) => {
    const meals = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Meal[];
    callback(meals);
  });
}

/**
 * Get meal statistics for a trip
 */
export async function getMealStats(userId: string, tripId: string, totalDays: number): Promise<{
  breakfast: number;
  lunch: number;
  dinner: number;
  snack: number;
  total: number;
  possibleMeals: number;
}> {
  const meals = await getTripMeals(userId, tripId);

  const stats = {
    breakfast: meals.filter((m) => m.category === "breakfast").length,
    lunch: meals.filter((m) => m.category === "lunch").length,
    dinner: meals.filter((m) => m.category === "dinner").length,
    snack: meals.filter((m) => m.category === "snack").length,
    total: meals.length,
    possibleMeals: totalDays * 3, // 3 main meals per day
  };

  return stats;
}
