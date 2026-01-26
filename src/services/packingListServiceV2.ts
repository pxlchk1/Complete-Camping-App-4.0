/**
 * 🚫 LOCKED UX: PACKING LIST SERVICE (DO NOT REFACTOR BEHAVIOR)
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * This service handles packing list operations for trips.
 * 
 * PROHIBITED CHANGES:
 * - Do not call initializeTripPackingList on screen mount
 * - Do not auto-seed items without explicit user action
 * - Do not create empty category shells
 * - Do not change the Firestore path structure
 * 
 * REQUIRED BEHAVIOR:
 * - Builder is the ONLY path to create starter items
 * - Items must use categoryKey from canonical enum
 * - hasTripPackingItems is the source of truth for "has built a list"
 * 
 * Firestore path: /users/{userId}/trips/{tripId}/packingList/{itemId}
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "../config/firebase";
import {
  PackingLibraryCategory,
  PackingLibraryItem,
  TripPackingItem,
  PackingSuggestion,
  PackingCategoryGroup,
} from "../types/packingLibrary";
import {
  PACKING_LIBRARY_CATEGORIES,
  PACKING_LIBRARY_ITEMS,
  getBaseItems,
  getSuggestedItems,
  getCategoryById,
} from "../data/packingLibrarySeed";
import {
  TripContext,
  buildTripContext,
  PACKING_LIST_VERSION,
  normalizeCategoryId,
} from "../utils/packingUtils";
import { Trip } from "../types/camping";

// ============================================================================
// TYPES
// ============================================================================

interface InitializationResult {
  success: boolean;
  itemCount: number;
  error?: string;
}

interface SuggestionsResult {
  suggestions: PackingSuggestion[];
  context: TripContext;
}

// ============================================================================
// LIBRARY ACCESS (uses seed data, could be migrated to Firestore)
// ============================================================================

/**
 * Get all categories from library
 */
export function getLibraryCategories(): PackingLibraryCategory[] {
  return PACKING_LIBRARY_CATEGORIES;
}

/**
 * Get all items from library
 */
export function getLibraryItems(): PackingLibraryItem[] {
  return PACKING_LIBRARY_ITEMS;
}

// ============================================================================
// TRIP PACKING LIST INITIALIZATION
// ============================================================================

/**
 * Check if a trip has any packing list items
 * This is the source of truth for "has built a packing list"
 * @returns true if the trip has at least 1 packing item
 */
export async function hasTripPackingItems(
  userId: string,
  tripId: string
): Promise<boolean> {
  try {
    const packingRef = collection(db, "users", userId, "trips", tripId, "packingList");
    const snapshot = await getDocs(packingRef);
    return !snapshot.empty;
  } catch (error) {
    console.error("Error checking packing items:", error);
    return false;
  }
}

/**
 * Check if trip packing list needs initialization
 */
export async function needsInitialization(
  userId: string,
  tripId: string
): Promise<boolean> {
  try {
    // Check trip document for initialization flag
    const tripRef = doc(db, "users", userId, "trips", tripId);
    const tripSnap = await getDoc(tripRef);
    
    if (!tripSnap.exists()) {
      console.warn("Trip not found for packing initialization check:", tripId);
      return false;
    }

    const tripData = tripSnap.data();
    
    // If not initialized, needs initialization
    if (!tripData.packingListInitialized) {
      return true;
    }

    // If version mismatch, needs re-initialization
    if (tripData.packingListVersion !== PACKING_LIST_VERSION) {
      return true;
    }

    // Check if list is actually empty
    const packingRef = collection(db, "users", userId, "trips", tripId, "packingList");
    const snapshot = await getDocs(packingRef);
    
    if (snapshot.empty) {
      return true;
    }

    return false;
  } catch (error) {
    console.error("Error checking packing initialization:", error);
    return false;
  }
}

/**
 * Initialize trip packing list with base items
 * This should only run once per trip (or on version upgrade)
 */
export async function initializeTripPackingList(
  userId: string,
  tripId: string,
  trip: Trip
): Promise<InitializationResult> {
  try {
    // Build trip context from trip data
    const startDate = trip.startDate ? new Date(trip.startDate) : new Date();
    const latitude = trip.destination?.coordinates?.latitude ?? trip.coordinates?.latitude;
    const locationName = trip.destination?.name ?? trip.locationName;

    const context = buildTripContext(startDate, {
      latitude,
      campingStyle: trip.campingStyle,
      locationName,
    });

    console.log("[PackingV2] Initializing packing list with context:", context);

    // Get base items for this camping style
    const baseItems = getBaseItems(trip.campingStyle);

    // Also get initial suggestions that are high-priority (priority >= 4)
    const suggestedItems = getSuggestedItems(context).filter(item => item.priority >= 4);

    // Combine base + high-priority suggestions
    const allItems = [...baseItems, ...suggestedItems];

    // Deduplicate by name (in case of overlaps)
    const uniqueItems = allItems.reduce((acc, item) => {
      if (!acc.find(i => i.name === item.name)) {
        acc.push(item);
      }
      return acc;
    }, [] as PackingLibraryItem[]);

    console.log(`[PackingV2] Adding ${uniqueItems.length} items (${baseItems.length} base + ${suggestedItems.length} suggested)`);

    // Batch write all items
    const batch = writeBatch(db);
    const packingRef = collection(db, "users", userId, "trips", tripId, "packingList");

    uniqueItems.forEach((item) => {
      const itemRef = doc(packingRef);
      const tripItem: Omit<TripPackingItem, "id"> = {
        name: item.name,
        categoryId: item.categoryId,
        qty: item.defaultQty,
        isPacked: false,
        source: item.tags.base ? "base" : "suggested",
        libraryItemId: item.id,
        addedReason: item.tags.base ? undefined : getAddedReason(context),
        createdAt: serverTimestamp() as Timestamp,
        updatedAt: serverTimestamp() as Timestamp,
      };
      batch.set(itemRef, tripItem);
    });

    // Update trip document with initialization flag
    const tripRef = doc(db, "users", userId, "trips", tripId);
    batch.update(tripRef, {
      packingListInitialized: true,
      packingListVersion: PACKING_LIST_VERSION,
      updatedAt: serverTimestamp(),
    });

    await batch.commit();

    console.log(`[PackingV2] Successfully initialized packing list with ${uniqueItems.length} items`);

    return {
      success: true,
      itemCount: uniqueItems.length,
    };
  } catch (error: any) {
    console.error("Error initializing packing list:", error);
    return {
      success: false,
      itemCount: 0,
      error: error.message,
    };
  }
}

/**
 * Generate a reason string for why an item was suggested
 */
function getAddedReason(context: TripContext): string {
  const reasons: string[] = [];
  
  if (context.season === "winter") reasons.push("Winter");
  if (context.tempBand === "below_freezing") reasons.push("Freezing temps");
  else if (context.tempBand === "cold") reasons.push("Cold weather");
  else if (context.tempBand === "hot") reasons.push("Hot weather");
  
  if (context.windy) reasons.push("Windy");
  if (context.precip === "snow") reasons.push("Snow");
  else if (context.precip === "rain") reasons.push("Rain");
  
  return reasons.slice(0, 2).join(", ") || "Recommended";
}

// ============================================================================
// SUGGESTIONS
// ============================================================================

/**
 * Compute suggestions for a trip based on context
 */
export async function computeSuggestions(
  userId: string,
  tripId: string,
  trip: Trip
): Promise<SuggestionsResult> {
  try {
    // Build trip context
    const startDate = trip.startDate ? new Date(trip.startDate) : new Date();
    const latitude = trip.destination?.coordinates?.latitude ?? trip.coordinates?.latitude;
    const locationName = trip.destination?.name ?? trip.locationName;

    const context = buildTripContext(startDate, {
      latitude,
      campingStyle: trip.campingStyle,
      locationName,
    });

    // Get all suggested items for this context
    const allSuggested = getSuggestedItems(context);

    // Get current packing list items (to exclude already added)
    const packingRef = collection(db, "users", userId, "trips", tripId, "packingList");
    const packingSnapshot = await getDocs(packingRef);
    const existingLibraryIds = new Set<string>();
    const existingNames = new Set<string>();
    
    packingSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      if (data.libraryItemId) existingLibraryIds.add(data.libraryItemId);
      if (data.name) existingNames.add(data.name.toLowerCase());
    });

    // Get dismissed suggestions
    const suggestionsRef = collection(db, "users", userId, "trips", tripId, "packingSuggestions");
    const suggestionsSnapshot = await getDocs(suggestionsRef);
    const dismissedIds = new Set<string>();
    
    suggestionsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      if (data.status === "dismissed") {
        dismissedIds.add(doc.id);
      }
    });

    // Filter out already added and dismissed items
    const filteredSuggestions = allSuggested.filter((item) => {
      // Skip if already in packing list
      if (existingLibraryIds.has(item.id)) return false;
      if (existingNames.has(item.name.toLowerCase())) return false;
      
      // Skip if dismissed
      if (dismissedIds.has(item.id)) return false;
      
      return true;
    });

    // Sort by priority (highest first), then by name
    filteredSuggestions.sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      return a.name.localeCompare(b.name);
    });

    // Convert to PackingSuggestion with reason
    const suggestions: PackingSuggestion[] = filteredSuggestions.slice(0, 12).map((item) => ({
      ...item,
      reason: getSuggestionReason(item, context),
    }));

    return {
      suggestions,
      context,
    };
  } catch (error) {
    console.error("Error computing suggestions:", error);
    return {
      suggestions: [],
      context: buildTripContext(new Date()),
    };
  }
}

/**
 * Generate a user-friendly reason for a suggestion
 */
function getSuggestionReason(item: PackingLibraryItem, context: TripContext): string {
  if (item.tags.temps.includes("below_freezing") && context.tempBand === "below_freezing") {
    return "Freezing temperatures";
  }
  if (item.tags.temps.includes("cold") && (context.tempBand === "cold" || context.tempBand === "below_freezing")) {
    return "Cold weather";
  }
  if (item.tags.seasons.includes("winter") && context.season === "winter") {
    return "Winter camping";
  }
  if (item.tags.precip.includes("snow") && context.precip === "snow") {
    return "Snow expected";
  }
  if (item.tags.precip.includes("rain") && context.precip === "rain") {
    return "Rain expected";
  }
  if (item.tags.wind.includes("windy") && context.windy) {
    return "Windy conditions";
  }
  if (item.tags.temps.includes("hot") && context.tempBand === "hot") {
    return "Hot weather";
  }
  return "Recommended for this trip";
}

/**
 * Add a suggestion to the packing list
 */
export async function addSuggestion(
  userId: string,
  tripId: string,
  item: PackingLibraryItem,
  reason: string
): Promise<void> {
  try {
    const batch = writeBatch(db);

    // Add to packing list
    const packingRef = collection(db, "users", userId, "trips", tripId, "packingList");
    const itemRef = doc(packingRef);
    
    const tripItem: Omit<TripPackingItem, "id"> = {
      name: item.name,
      categoryId: item.categoryId,
      qty: item.defaultQty,
      isPacked: false,
      source: "suggested",
      libraryItemId: item.id,
      addedReason: reason,
      createdAt: serverTimestamp() as Timestamp,
      updatedAt: serverTimestamp() as Timestamp,
    };
    batch.set(itemRef, tripItem);

    // Mark suggestion as added
    const suggestionRef = doc(db, "users", userId, "trips", tripId, "packingSuggestions", item.id);
    batch.set(suggestionRef, {
      libraryItemId: item.id,
      status: "added",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await batch.commit();
  } catch (error) {
    console.error("Error adding suggestion:", error);
    throw error;
  }
}

/**
 * Dismiss a suggestion
 */
export async function dismissSuggestion(
  userId: string,
  tripId: string,
  libraryItemId: string
): Promise<void> {
  try {
    const suggestionRef = doc(db, "users", userId, "trips", tripId, "packingSuggestions", libraryItemId);
    await setDoc(suggestionRef, {
      libraryItemId,
      status: "dismissed",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error dismissing suggestion:", error);
    throw error;
  }
}

// ============================================================================
// PACKING LIST CRUD
// ============================================================================

/**
 * Get all packing items for a trip
 */
export async function getTripPackingItems(
  userId: string,
  tripId: string
): Promise<TripPackingItem[]> {
  try {
    const packingRef = collection(db, "users", userId, "trips", tripId, "packingList");
    const snapshot = await getDocs(packingRef);

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as TripPackingItem[];
  } catch (error) {
    console.error("Error getting packing items:", error);
    throw error;
  }
}

/**
 * Add a custom item to the packing list
 */
export async function addCustomItem(
  userId: string,
  tripId: string,
  name: string,
  categoryId: string,
  qty: number = 1,
  notes?: string
): Promise<string> {
  try {
    const packingRef = collection(db, "users", userId, "trips", tripId, "packingList");
    const itemRef = doc(packingRef);

    const tripItem: Omit<TripPackingItem, "id"> = {
      name,
      categoryId: normalizeCategoryId(categoryId),
      qty,
      isPacked: false,
      source: "user",
      createdAt: serverTimestamp() as Timestamp,
      updatedAt: serverTimestamp() as Timestamp,
    };

    await setDoc(itemRef, tripItem);
    return itemRef.id;
  } catch (error) {
    console.error("Error adding custom item:", error);
    throw error;
  }
}

/**
 * Toggle packed status for an item
 */
export async function toggleItemPacked(
  userId: string,
  tripId: string,
  itemId: string,
  isPacked: boolean
): Promise<void> {
  try {
    const itemRef = doc(db, "users", userId, "trips", tripId, "packingList", itemId);
    await updateDoc(itemRef, {
      isPacked,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error toggling item packed:", error);
    throw error;
  }
}

/**
 * Delete an item from the packing list
 */
export async function deleteItem(
  userId: string,
  tripId: string,
  itemId: string
): Promise<void> {
  try {
    const itemRef = doc(db, "users", userId, "trips", tripId, "packingList", itemId);
    await deleteDoc(itemRef);
  } catch (error) {
    console.error("Error deleting item:", error);
    throw error;
  }
}

/**
 * Update item quantity
 */
export async function updateItemQty(
  userId: string,
  tripId: string,
  itemId: string,
  qty: number
): Promise<void> {
  try {
    const itemRef = doc(db, "users", userId, "trips", tripId, "packingList", itemId);
    await updateDoc(itemRef, {
      qty,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error updating item quantity:", error);
    throw error;
  }
}

// ============================================================================
// UI HELPERS
// ============================================================================

/**
 * Group packing items by category for UI display
 */
export function groupItemsByCategory(items: TripPackingItem[]): PackingCategoryGroup[] {
  // Get unique category IDs from items
  const categoryIds = [...new Set(items.map((item) => item.categoryId))];

  // Build category groups
  const groups: PackingCategoryGroup[] = categoryIds.map((categoryId) => {
    const category = getCategoryById(categoryId);
    const categoryItems = items.filter((item) => item.categoryId === categoryId);
    const packedCount = categoryItems.filter((item) => item.isPacked).length;

    return {
      categoryId,
      label: category?.label ?? categoryId,
      icon: category?.icon,
      order: category?.order ?? 99,
      items: categoryItems,
      packedCount,
      totalCount: categoryItems.length,
    };
  });

  // Sort by category order
  groups.sort((a, b) => a.order - b.order);

  return groups;
}

/**
 * Force re-initialization of packing list
 * Use when user wants to rebuild their list
 */
export async function forceReinitialize(
  userId: string,
  tripId: string,
  trip: Trip
): Promise<InitializationResult> {
  try {
    // Delete all current items
    const packingRef = collection(db, "users", userId, "trips", tripId, "packingList");
    const snapshot = await getDocs(packingRef);
    
    const batch = writeBatch(db);
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    // Also clear suggestions
    const suggestionsRef = collection(db, "users", userId, "trips", tripId, "packingSuggestions");
    const suggestionsSnapshot = await getDocs(suggestionsRef);
    suggestionsSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    // Reset initialization flag
    const tripRef = doc(db, "users", userId, "trips", tripId);
    batch.update(tripRef, {
      packingListInitialized: false,
      packingListVersion: null,
    });

    await batch.commit();

    // Re-initialize
    return await initializeTripPackingList(userId, tripId, trip);
  } catch (error: any) {
    console.error("Error force reinitializing:", error);
    return {
      success: false,
      itemCount: 0,
      error: error.message,
    };
  }
}
