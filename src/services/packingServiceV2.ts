/**
 * Packing Service V2
 * Handles packing list operations with Firebase and local storage fallback
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  writeBatch,
  Timestamp,
} from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { db } from "../config/firebase";
import {
  PackingItemV2,
  TripPackingList,
  PackingTemplate,
  PackingTemplateItem,
  PackingGenerationRequest,
  PackingCategory,
  TripType,
  Season,
  AmenityFlags,
  DEFAULT_AMENITIES,
  getTemperatureProfile,
} from "../types/packingV2";
import { PACKING_TEMPLATES, getRecommendedTemplates, generateTemplateId } from "../data/packingTemplates";
import { getUserGear } from "./gearClosetService";
import { GearItem, GearCategory } from "../types/gear";

// ============================================================================
// CONSTANTS
// ============================================================================

const PACKING_ITEMS_COLLECTION = "packingItems";
const PACKING_LISTS_COLLECTION = "packingLists";
const PACKING_TEMPLATES_COLLECTION = "packingTemplates";
const TEMPLATE_ITEMS_COLLECTION = "items";

const LOCAL_STORAGE_PREFIX = "packing_v2_";

// ============================================================================
// TRIP PACKING LIST OPERATIONS
// ============================================================================

/**
 * Get packing list for a trip
 */
export async function getTripPackingList(
  userId: string,
  tripId: string
): Promise<TripPackingList | null> {
  try {
    const docRef = doc(db, "users", userId, "trips", tripId, PACKING_LISTS_COLLECTION, "main");
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return docSnap.data() as TripPackingList;
    }
    return null;
  } catch (error) {
    console.log("[PackingService] Firebase error, trying local storage:", error);
    return getLocalPackingList(tripId);
  }
}

/**
 * Get all packing items for a trip
 */
export async function getTripPackingItems(
  userId: string,
  tripId: string
): Promise<PackingItemV2[]> {
  try {
    const itemsRef = collection(
      db,
      "users",
      userId,
      "trips",
      tripId,
      PACKING_ITEMS_COLLECTION
    );
    const q = query(itemsRef, orderBy("category"), orderBy("name"));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as PackingItemV2[];
  } catch (error) {
    console.log("[PackingService] Firebase error, trying local storage:", error);
    return getLocalPackingItems(tripId);
  }
}

/**
 * Create or update a packing item
 */
export async function savePackingItem(
  userId: string,
  tripId: string,
  item: Partial<PackingItemV2> & { id?: string }
): Promise<string> {
  const now = new Date().toISOString();
  const itemId = item.id || `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const itemData: PackingItemV2 = {
    id: itemId,
    name: item.name || "",
    category: item.category || "optional_extras",
    isEssential: item.isEssential ?? false,
    isPacked: item.isPacked ?? false,
    quantity: item.quantity ?? 1,
    notes: item.notes,
    isFromGearCloset: item.isFromGearCloset ?? false,
    gearClosetId: item.gearClosetId,
    isFromTemplate: item.isFromTemplate ?? false,
    templateItemId: item.templateItemId,
    gearGroup: item.gearGroup,
    variant: item.variant,
    tags: item.tags,
    createdAt: item.createdAt || now,
    updatedAt: now,
  };

  try {
    const docRef = doc(
      db,
      "users",
      userId,
      "trips",
      tripId,
      PACKING_ITEMS_COLLECTION,
      itemId
    );
    await setDoc(docRef, itemData);
    
    // Update list totals
    await updatePackingListTotals(userId, tripId);
    
    return itemId;
  } catch (error) {
    console.log("[PackingService] Firebase error, saving locally:", error);
    await saveLocalPackingItem(tripId, itemData);
    return itemId;
  }
}

/**
 * Toggle item packed status
 */
export async function toggleItemPacked(
  userId: string,
  tripId: string,
  itemId: string,
  isPacked: boolean
): Promise<void> {
  const now = new Date().toISOString();

  try {
    const docRef = doc(
      db,
      "users",
      userId,
      "trips",
      tripId,
      PACKING_ITEMS_COLLECTION,
      itemId
    );
    await updateDoc(docRef, { isPacked, updatedAt: now });
    
    // Update list totals
    await updatePackingListTotals(userId, tripId);
  } catch (error) {
    console.log("[PackingService] Firebase error, updating locally:", error);
    await toggleLocalItemPacked(tripId, itemId, isPacked);
  }
}

/**
 * Delete a packing item
 */
export async function deletePackingItem(
  userId: string,
  tripId: string,
  itemId: string
): Promise<void> {
  try {
    const docRef = doc(
      db,
      "users",
      userId,
      "trips",
      tripId,
      PACKING_ITEMS_COLLECTION,
      itemId
    );
    await deleteDoc(docRef);
    
    // Update list totals
    await updatePackingListTotals(userId, tripId);
  } catch (error) {
    console.log("[PackingService] Firebase error, deleting locally:", error);
    await deleteLocalPackingItem(tripId, itemId);
  }
}

/**
 * Update packing list totals
 */
async function updatePackingListTotals(
  userId: string,
  tripId: string
): Promise<void> {
  try {
    const items = await getTripPackingItems(userId, tripId);
    const totalItems = items.length;
    const packedItems = items.filter((i) => i.isPacked).length;

    const listRef = doc(
      db,
      "users",
      userId,
      "trips",
      tripId,
      PACKING_LISTS_COLLECTION,
      "main"
    );
    await updateDoc(listRef, {
      totalItems,
      packedItems,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.log("[PackingService] Could not update totals:", error);
  }
}

// ============================================================================
// SMART GEAR MATCHING
// ============================================================================

// Map gear categories to packing categories
const GEAR_TO_PACKING_CATEGORY: Record<GearCategory, PackingCategory> = {
  camp_comfort: "camp_comfort",
  campFurniture: "camp_comfort",
  clothing: "clothing",
  documents_essentials: "documents_essentials",
  electronics: "electronics",
  entertainment: "optional_extras",
  food: "food",
  hygiene: "hygiene",
  kitchen: "kitchen",
  lighting: "lighting",
  meal_prep: "kitchen",
  optional_extras: "optional_extras",
  pet_supplies: "optional_extras",
  safety: "navigation_safety",
  seating: "camp_comfort",
  shelter: "shelter",
  sleep: "sleep",
  tools: "tools_repairs",
  water: "water",
};

/**
 * Find matching gear from user's gear closet for a packing item
 * Uses fuzzy name matching and category matching
 */
function findMatchingGear(
  packingItem: PackingItemV2,
  userGear: GearItem[]
): GearItem | null {
  const normalizeString = (str: string) =>
    str.toLowerCase().trim().replace(/[^\w\s]/g, "").replace(/\s+/g, " ");

  const packingName = normalizeString(packingItem.name);
  const packingWords = packingName.split(" ");

  // First try: exact match on name
  const exactMatch = userGear.find(
    (gear) => normalizeString(gear.name) === packingName
  );
  if (exactMatch) return exactMatch;

  // Second try: find gear in matching category with similar name
  const categoryMatches = userGear.filter((gear) => {
    const gearPackingCategory = GEAR_TO_PACKING_CATEGORY[gear.category];
    return gearPackingCategory === packingItem.category;
  });

  for (const gear of categoryMatches) {
    const gearName = normalizeString(gear.name);
    const gearWords = gearName.split(" ");

    // Check if significant words match (ignoring articles, sizes, etc.)
    const significantPackingWords = packingWords.filter(
      (w) => w.length > 2 && !["the", "for", "and", "with"].includes(w)
    );
    const significantGearWords = gearWords.filter(
      (w) => w.length > 2 && !["the", "for", "and", "with"].includes(w)
    );

    // Count matching words
    const matchingWords = significantPackingWords.filter((pw) =>
      significantGearWords.some(
        (gw) => gw.includes(pw) || pw.includes(gw)
      )
    );

    // If more than half the significant words match, it's a match
    if (
      matchingWords.length >= Math.ceil(significantPackingWords.length / 2) &&
      matchingWords.length >= 1
    ) {
      return gear;
    }
  }

  return null;
}

/**
 * Link packing items to user's gear closet items
 * Returns the number of items that were linked
 */
async function linkItemsToGearCloset(
  userId: string,
  packingItems: PackingItemV2[]
): Promise<{ linkedCount: number }> {
  try {
    const userGear = await getUserGear(userId);
    if (userGear.length === 0) return { linkedCount: 0 };

    let linkedCount = 0;
    const usedGearIds = new Set<string>();

    for (const item of packingItems) {
      // Skip if already linked
      if (item.isFromGearCloset) continue;

      const matchingGear = findMatchingGear(
        item,
        userGear.filter((g) => !usedGearIds.has(g.id))
      );

      if (matchingGear) {
        // Update item with gear closet info
        item.isFromGearCloset = true;
        item.gearClosetId = matchingGear.id;
        // Add brand/model as notes if available
        const gearInfo = [matchingGear.brand, matchingGear.model]
          .filter(Boolean)
          .join(" ");
        if (gearInfo && !item.notes) {
          item.notes = gearInfo;
        }
        usedGearIds.add(matchingGear.id);
        linkedCount++;
      }
    }

    return { linkedCount };
  } catch (error) {
    console.log("[PackingService] Error linking to gear closet:", error);
    return { linkedCount: 0 };
  }
}

// ============================================================================
// LIST GENERATION
// ============================================================================

/**
 * Generate a packing list from template
 */
export async function generatePackingList(
  userId: string,
  tripId: string,
  request: PackingGenerationRequest
): Promise<void> {
  const now = new Date().toISOString();

  // Find matching template
  const templates = getRecommendedTemplates(request.tripType, request.season);
  const template = request.templateId
    ? templates.find((t) => generateTemplateId(t.template.name) === request.templateId)
    : templates[0];

  if (!template) {
    throw new Error("No matching template found");
  }

  // Determine temperature profile
  const tempProfile = getTemperatureProfile(request.season, request.forecastLow);

  // Filter items based on gear groups (no duplicates)
  const selectedItems = new Map<string, typeof template.items[0]>();
  const usedGearGroups = new Set<string>();

  for (const item of template.items) {
    // Skip if this gear group already has a selection
    if (item.gearGroup && usedGearGroups.has(item.gearGroup)) {
      continue;
    }

    // For gear groups, select based on temperature profile
    if (item.gearGroup) {
      const isMatch = matchesTemperatureProfile(item.variant, tempProfile);
      if (isMatch) {
        selectedItems.set(item.name, item);
        usedGearGroups.add(item.gearGroup);
      }
    } else {
      selectedItems.set(item.name, item);
    }
  }

  // Scale quantities based on nights and party size
  const nightsMultiplier = request.nights / template.template.defaultNights;
  const partyMultiplier = request.partySize > 1 ? request.partySize : 1;

  // Create packing items
  const packingItems: PackingItemV2[] = Array.from(selectedItems.values()).map((templateItem) => {
    let quantity = templateItem.quantity;

    // Scale consumables
    if (isConsumable(templateItem.category, templateItem.name)) {
      quantity = Math.ceil(quantity * nightsMultiplier);
    }

    return {
      id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: templateItem.name,
      category: templateItem.category,
      isEssential: templateItem.isEssential,
      isPacked: false,
      quantity,
      notes: templateItem.notes,
      isFromGearCloset: false,
      isFromTemplate: true,
      templateItemId: generateTemplateId(templateItem.name),
      gearGroup: templateItem.gearGroup,
      variant: templateItem.variant,
      createdAt: now,
      updatedAt: now,
    };
  });

  // Apply amenity-based adjustments
  applyAmenityAdjustments(packingItems, request.amenities);

  // Smart gear matching - link items to user's gear closet
  const { linkedCount } = await linkItemsToGearCloset(userId, packingItems);
  console.log(`[PackingService] Linked ${linkedCount} items to gear closet`);

  try {
    const batch = writeBatch(db);

    // Create packing list document
    const listRef = doc(
      db,
      "users",
      userId,
      "trips",
      tripId,
      PACKING_LISTS_COLLECTION,
      "main"
    );
    const listData: TripPackingList = {
      id: "main",
      tripId,
      userId,
      generatedFrom: {
        templateId: generateTemplateId(template.template.name),
        tripType: request.tripType,
        season: request.season,
        nights: request.nights,
        partySize: request.partySize,
        amenities: request.amenities,
      },
      totalItems: packingItems.length,
      packedItems: 0,
      status: "active",
      createdAt: now,
      updatedAt: now,
    };
    batch.set(listRef, listData);

    // Create all packing items
    for (const item of packingItems) {
      const itemRef = doc(
        db,
        "users",
        userId,
        "trips",
        tripId,
        PACKING_ITEMS_COLLECTION,
        item.id
      );
      batch.set(itemRef, item);
    }

    await batch.commit();
  } catch (error) {
    console.log("[PackingService] Firebase error, saving locally:", error);
    await saveLocalPackingList(tripId, packingItems);
  }
}

/**
 * Copy packing list from one trip to another
 * Returns the number of items copied
 */
export async function copyPackingListFromTrip(
  userId: string,
  sourceTripId: string,
  targetTripId: string
): Promise<{ copiedCount: number; linkedCount: number }> {
  const now = new Date().toISOString();

  try {
    // Get source items
    const sourceItems = await getTripPackingItems(userId, sourceTripId);
    
    if (sourceItems.length === 0) {
      return { copiedCount: 0, linkedCount: 0 };
    }

    // Create new items for target trip (reset packed status)
    const newItems: PackingItemV2[] = sourceItems.map((item) => ({
      ...item,
      id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      isPacked: false,
      createdAt: now,
      updatedAt: now,
    }));

    // Smart gear matching - ensure items are linked to current gear
    const { linkedCount } = await linkItemsToGearCloset(userId, newItems);

    const batch = writeBatch(db);

    // Create packing list document
    const listRef = doc(
      db,
      "users",
      userId,
      "trips",
      targetTripId,
      PACKING_LISTS_COLLECTION,
      "main"
    );
    const listData: TripPackingList = {
      id: "main",
      tripId: targetTripId,
      userId,
      generatedFrom: {
        templateId: `copied_from_${sourceTripId}`,
        tripType: "car_camping" as TripType,
        season: "summer" as Season,
        nights: 2,
        partySize: 2,
        amenities: DEFAULT_AMENITIES,
      },
      totalItems: newItems.length,
      packedItems: 0,
      status: "active",
      createdAt: now,
      updatedAt: now,
    };
    batch.set(listRef, listData);

    // Create all items
    for (const item of newItems) {
      const itemRef = doc(
        db,
        "users",
        userId,
        "trips",
        targetTripId,
        PACKING_ITEMS_COLLECTION,
        item.id
      );
      batch.set(itemRef, item);
    }

    await batch.commit();
    return { copiedCount: newItems.length, linkedCount };
  } catch (error) {
    console.error("[PackingService] Error copying packing list:", error);
    throw error;
  }
}

/**
 * Get trips that have packing lists
 */
export async function getTripsWithPackingLists(
  userId: string,
  excludeTripId?: string
): Promise<Array<{ tripId: string; itemCount: number }>> {
  try {
    // Get all trips for user (we'll check each one for packing lists)
    const tripsRef = collection(db, "users", userId, "trips");
    const tripsSnapshot = await getDocs(tripsRef);
    
    const results: Array<{ tripId: string; itemCount: number }> = [];
    
    for (const tripDoc of tripsSnapshot.docs) {
      if (tripDoc.id === excludeTripId) continue;
      
      // Check if this trip has a packing list
      const listRef = doc(
        db,
        "users",
        userId,
        "trips",
        tripDoc.id,
        PACKING_LISTS_COLLECTION,
        "main"
      );
      const listSnap = await getDoc(listRef);
      
      if (listSnap.exists()) {
        const listData = listSnap.data() as TripPackingList;
        if (listData.totalItems > 0) {
          results.push({
            tripId: tripDoc.id,
            itemCount: listData.totalItems,
          });
        }
      }
    }
    
    return results;
  } catch (error) {
    console.log("[PackingService] Error getting trips with packing lists:", error);
    return [];
  }
}

/**
 * Check if item variant matches temperature profile
 */
function matchesTemperatureProfile(
  variant: string | undefined,
  profile: "warm" | "mild" | "cold"
): boolean {
  if (!variant) return true;

  switch (profile) {
    case "cold":
      return ["cold", "4season", "insulated"].includes(variant);
    case "warm":
      return ["warm", "3season", "standard"].includes(variant);
    case "mild":
      return ["mid", "3season", "standard"].includes(variant);
    default:
      return true;
  }
}

/**
 * Check if item is a consumable that should scale with trip length
 */
function isConsumable(category: PackingCategory, name: string): boolean {
  const consumableCategories: PackingCategory[] = ["food", "water", "hygiene"];
  if (consumableCategories.includes(category)) {
    // Check for specific non-consumables
    const nonConsumables = ["water filter", "trowel", "toothbrush"];
    return !nonConsumables.some((nc) => name.toLowerCase().includes(nc));
  }

  // Check for consumable keywords
  const consumableKeywords = ["fuel", "batteries", "ice", "wipes"];
  return consumableKeywords.some((kw) => name.toLowerCase().includes(kw));
}

/**
 * Apply amenity-based adjustments to packing list
 */
function applyAmenityAdjustments(
  items: PackingItemV2[],
  amenities: AmenityFlags
): void {
  // If running water available, reduce water storage
  if (amenities.runningWater) {
    const waterItems = items.filter(
      (i) => i.category === "water" && i.name.toLowerCase().includes("jug")
    );
    waterItems.forEach((i) => {
      i.isEssential = false;
      i.notes = (i.notes || "") + " (running water available)";
    });
  }

  // If bear lockers required, ensure bear storage items
  if (amenities.bearLockers) {
    const hasBearItem = items.some(
      (i) => i.name.toLowerCase().includes("bear") && i.name.toLowerCase().includes("canister")
    );
    if (hasBearItem) {
      const bearItem = items.find((i) => i.name.toLowerCase().includes("bear"));
      if (bearItem) {
        bearItem.notes = (bearItem.notes || "") + " (bear lockers available at site)";
      }
    }
  }
}

// ============================================================================
// USER TEMPLATES
// ============================================================================

/**
 * Get user's saved templates
 */
export async function getUserTemplates(userId: string): Promise<PackingTemplate[]> {
  try {
    const templatesRef = collection(db, "users", userId, PACKING_TEMPLATES_COLLECTION);
    const q = query(templatesRef, orderBy("updatedAt", "desc"));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as PackingTemplate[];
  } catch (error) {
    console.log("[PackingService] Error fetching user templates:", error);
    return [];
  }
}

/**
 * Save current packing list as a template
 */
export async function saveAsTemplate(
  userId: string,
  tripId: string,
  templateName: string,
  description?: string,
  tripTypes?: TripType[],
  seasons?: Season[]
): Promise<string> {
  const now = new Date().toISOString();
  const templateId = `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Get current packing items
  const items = await getTripPackingItems(userId, tripId);

  try {
    const batch = writeBatch(db);

    // Create template document
    const templateRef = doc(db, "users", userId, PACKING_TEMPLATES_COLLECTION, templateId);
    const templateData: PackingTemplate = {
      id: templateId,
      name: templateName,
      description,
      userId,
      isSystem: false,
      tripTypes: tripTypes || [],
      seasons: seasons || [],
      defaultNights: 2,
      tags: [],
      itemCount: items.length,
      useCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    batch.set(templateRef, templateData);

    // Create template items
    for (const item of items) {
      const itemRef = doc(
        db,
        "users",
        userId,
        PACKING_TEMPLATES_COLLECTION,
        templateId,
        TEMPLATE_ITEMS_COLLECTION,
        item.id
      );
      const templateItem: PackingTemplateItem = {
        id: item.id,
        templateId,
        name: item.name,
        category: item.category,
        isEssential: item.isEssential,
        quantity: item.quantity,
        notes: item.notes,
        gearGroup: item.gearGroup,
        variant: item.variant,
        gearClosetEligible: item.isFromGearCloset,
      };
      batch.set(itemRef, templateItem);
    }

    await batch.commit();
    return templateId;
  } catch (error) {
    console.log("[PackingService] Error saving template:", error);
    throw error;
  }
}

// ============================================================================
// LOCAL STORAGE FALLBACK
// ============================================================================

async function getLocalPackingList(tripId: string): Promise<TripPackingList | null> {
  try {
    const data = await AsyncStorage.getItem(`${LOCAL_STORAGE_PREFIX}list_${tripId}`);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

async function getLocalPackingItems(tripId: string): Promise<PackingItemV2[]> {
  try {
    const data = await AsyncStorage.getItem(`${LOCAL_STORAGE_PREFIX}items_${tripId}`);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

async function saveLocalPackingItem(tripId: string, item: PackingItemV2): Promise<void> {
  try {
    const items = await getLocalPackingItems(tripId);
    const existingIndex = items.findIndex((i) => i.id === item.id);
    
    if (existingIndex >= 0) {
      items[existingIndex] = item;
    } else {
      items.push(item);
    }
    
    await AsyncStorage.setItem(`${LOCAL_STORAGE_PREFIX}items_${tripId}`, JSON.stringify(items));
  } catch (error) {
    console.log("[PackingService] Local storage error:", error);
  }
}

async function toggleLocalItemPacked(
  tripId: string,
  itemId: string,
  isPacked: boolean
): Promise<void> {
  try {
    const items = await getLocalPackingItems(tripId);
    const item = items.find((i) => i.id === itemId);
    
    if (item) {
      item.isPacked = isPacked;
      item.updatedAt = new Date().toISOString();
      await AsyncStorage.setItem(`${LOCAL_STORAGE_PREFIX}items_${tripId}`, JSON.stringify(items));
    }
  } catch (error) {
    console.log("[PackingService] Local storage error:", error);
  }
}

async function deleteLocalPackingItem(tripId: string, itemId: string): Promise<void> {
  try {
    const items = await getLocalPackingItems(tripId);
    const filtered = items.filter((i) => i.id !== itemId);
    await AsyncStorage.setItem(`${LOCAL_STORAGE_PREFIX}items_${tripId}`, JSON.stringify(filtered));
  } catch (error) {
    console.log("[PackingService] Local storage error:", error);
  }
}

async function saveLocalPackingList(tripId: string, items: PackingItemV2[]): Promise<void> {
  try {
    await AsyncStorage.setItem(`${LOCAL_STORAGE_PREFIX}items_${tripId}`, JSON.stringify(items));
    
    const listData: TripPackingList = {
      id: "main",
      tripId,
      userId: "local",
      totalItems: items.length,
      packedItems: 0,
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem(`${LOCAL_STORAGE_PREFIX}list_${tripId}`, JSON.stringify(listData));
  } catch (error) {
    console.log("[PackingService] Local storage error:", error);
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get items grouped by category
 */
export function groupItemsByCategory(
  items: PackingItemV2[]
): Map<PackingCategory, PackingItemV2[]> {
  const grouped = new Map<PackingCategory, PackingItemV2[]>();

  for (const item of items) {
    const existing = grouped.get(item.category) || [];
    existing.push(item);
    grouped.set(item.category, existing);
  }

  return grouped;
}

/**
 * Get category progress
 */
export function getCategoryProgress(
  items: PackingItemV2[]
): { packed: number; total: number } {
  return {
    packed: items.filter((i) => i.isPacked).length,
    total: items.length,
  };
}

/**
 * Filter items
 */
export function filterItems(
  items: PackingItemV2[],
  filter: "all" | "unpacked" | "packed" | "essentials" | "gear-linked"
): PackingItemV2[] {
  switch (filter) {
    case "unpacked":
      return items.filter((i) => !i.isPacked);
    case "packed":
      return items.filter((i) => i.isPacked);
    case "essentials":
      return items.filter((i) => i.isEssential);
    case "gear-linked":
      return items.filter((i) => i.isFromGearCloset === true);
    default:
      return items;
  }
}

/**
 * Reset all items to unpacked
 */
export async function resetPackingList(
  userId: string,
  tripId: string
): Promise<void> {
  const items = await getTripPackingItems(userId, tripId);
  
  for (const item of items) {
    if (item.isPacked) {
      await toggleItemPacked(userId, tripId, item.id, false);
    }
  }
}

/**
 * Clear entire packing list
 */
export async function clearPackingList(
  userId: string,
  tripId: string
): Promise<void> {
  const items = await getTripPackingItems(userId, tripId);
  
  for (const item of items) {
    await deletePackingItem(userId, tripId, item.id);
  }
}
