/**
 * Packing Service
 *
 * Manages packing list templates and generation for trips.
 * Templates are composed from:
 * 1. Base templates (everyone needs)
 * 2. Type-specific templates (based on camping style)
 * 3. Weather-specific templates (based on conditions)
 */

import { db } from "../config/firebase";
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  query,
  where,
  serverTimestamp,
  Timestamp
} from "firebase/firestore";
import { CampingStyle } from "../types/camping";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Template types:
 * - base: Core items everyone needs (flashlight, first aid, etc.)
 * - type: Specific to camping style (backpacking vs RV)
 * - weather: Specific to weather conditions (rain gear, sun protection)
 */
export type TemplateType = "base" | "type" | "weather";

/**
 * Weather tags for conditional packing
 * - cold: Below 50°F
 * - hot: Above 80°F
 * - wet: Rain/precipitation expected
 */
export type WeatherTag = "cold" | "hot" | "wet";

/**
 * Source of packing list item (for tracking and filtering)
 */
export type PackingItemSource = "base" | "type" | "weather" | "custom";

/**
 * Packing item categories for organization
 */
export type PackingCategory =
  | "sleep"
  | "shelter"
  | "kitchen"
  | "clothing"
  | "safety"
  | "tools"
  | "hygiene"
  | "food"
  | "water"
  | "entertainment"
  | "other";

/**
 * Individual packing item (in template)
 */
export interface PackingItem {
  id: string;
  label: string;
  category: PackingCategory;
  notes?: string;
}

/**
 * Template document structure (in Firestore)
 */
export interface TemplateDoc {
  id: string;
  label: string; // Display name for template
  templateType: TemplateType;
  campingTypes: string[]; // Empty array = applies to all types
  weatherTags: WeatherTag[]; // Empty array = applies to all weather
  addItems: PackingItem[]; // Items to add to packing list
  removeItems: string[]; // Item IDs to remove (for exclusions)
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

/**
 * Per-trip packing list item (in Firestore)
 */
export interface PackingListItem {
  id: string;
  label: string;
  category: PackingCategory;
  source: PackingItemSource; // Where this item came from
  campingType?: string; // Type-specific items
  weatherTags?: WeatherTag[]; // Weather-specific items
  isPacked: boolean;
  isRemoved: boolean; // User removed this item
  quantity: number;
  notes?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

/**
 * Trip context for generating packing list
 */
export interface TripContext {
  tripId: string;
  userId: string;
  campingType: CampingStyle;
  weatherTags: WeatherTag[];
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Convert CampingStyle enum to lowercase string for matching templates
 */
function campingTypeToKey(campingType: CampingStyle): string {
  return campingType.toLowerCase().replace(/_/g, "_");
}

/**
 * Check if template applies to given camping type
 */
function templateMatchesCampingType(template: TemplateDoc, campingType: CampingStyle): boolean {
  if (template.campingTypes.length === 0) return true; // Applies to all
  const typeKey = campingTypeToKey(campingType);
  return template.campingTypes.includes(typeKey);
}

/**
 * Check if template applies to given weather tags
 */
function templateMatchesWeather(template: TemplateDoc, weatherTags: WeatherTag[]): boolean {
  if (template.templateType !== "weather") return true; // Not a weather template
  if (template.weatherTags.length === 0) return true; // Applies to all weather

  // Template matches if ANY of its weather tags are in the trip's weather tags
  return template.weatherTags.some(tag => weatherTags.includes(tag));
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * 1. Load all packing templates from Firestore
 *
 * @returns Promise<TemplateDoc[]> - All templates in the packingTemplates collection
 */
export async function getPackingTemplates(): Promise<TemplateDoc[]> {
  try {
    const templatesRef = collection(db, "packingTemplates");
    const snapshot = await getDocs(templatesRef);

    const templates: TemplateDoc[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      templates.push({
        id: doc.id,
        label: data.label || "",
        templateType: data.templateType || "base",
        campingTypes: data.campingTypes || [],
        weatherTags: data.weatherTags || [],
        addItems: data.addItems || [],
        removeItems: data.removeItems || [],
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      });
    });

    return templates;
  } catch (error) {
    console.error("Error fetching packing templates:", error);
    throw error;
  }
}

/**
 * 2. Generate a packing list for a trip
 *
 * Logic:
 * 1. Fetch all templates
 * 2. Filter templates by camping type and weather
 * 3. Compose items (base + type + weather)
 * 4. Apply removeItems pattern (filter out excluded gear)
 * 5. Save to Firestore at users/{userId}/trips/{tripId}/packingList/{itemId}
 *
 * @param context - Trip context (tripId, userId, campingType, weatherTags)
 * @returns Promise<PackingListItem[]> - Generated packing list
 */
export async function generatePackingListForTrip(context: TripContext): Promise<PackingListItem[]> {
  try {
    const { tripId, userId, campingType, weatherTags } = context;

    // 1. Fetch all templates
    const templates = await getPackingTemplates();

    // 2. Filter applicable templates
    const baseTemplates = templates.filter(t => t.templateType === "base");
    const typeTemplates = templates.filter(t =>
      t.templateType === "type" && templateMatchesCampingType(t, campingType)
    );
    const weatherTemplates = templates.filter(t =>
      t.templateType === "weather" && templateMatchesWeather(t, weatherTags)
    );

    // 3. Collect all items to add
    const itemsMap = new Map<string, PackingListItem>();

    // Add base items
    baseTemplates.forEach(template => {
      template.addItems.forEach(item => {
        if (!itemsMap.has(item.id)) {
          itemsMap.set(item.id, {
            id: item.id,
            label: item.label,
            category: item.category,
            source: "base",
            isPacked: false,
            isRemoved: false,
            quantity: 1,
            notes: item.notes,
          });
        }
      });
    });

    // Add type-specific items
    typeTemplates.forEach(template => {
      template.addItems.forEach(item => {
        if (!itemsMap.has(item.id)) {
          itemsMap.set(item.id, {
            id: item.id,
            label: item.label,
            category: item.category,
            source: "type",
            campingType: campingTypeToKey(campingType),
            isPacked: false,
            isRemoved: false,
            quantity: 1,
            notes: item.notes,
          });
        }
      });
    });

    // Add weather-specific items
    weatherTemplates.forEach(template => {
      template.addItems.forEach(item => {
        if (!itemsMap.has(item.id)) {
          itemsMap.set(item.id, {
            id: item.id,
            label: item.label,
            category: item.category,
            source: "weather",
            weatherTags: template.weatherTags,
            isPacked: false,
            isRemoved: false,
            quantity: 1,
            notes: item.notes,
          });
        }
      });
    });

    // 4. Apply removeItems pattern (collect all items to remove)
    const itemsToRemove = new Set<string>();
    [...baseTemplates, ...typeTemplates, ...weatherTemplates].forEach(template => {
      template.removeItems.forEach(itemId => {
        itemsToRemove.add(itemId);
      });
    });

    // Filter out removed items
    itemsToRemove.forEach(itemId => {
      itemsMap.delete(itemId);
    });

    // 5. Convert to array
    const packingList = Array.from(itemsMap.values());

    // 6. Save to Firestore
    const packingListRef = collection(db, "users", userId, "trips", tripId, "packingList");

    // Save each item
    const savePromises = packingList.map(item => {
      const itemRef = doc(packingListRef, item.id);
      return setDoc(itemRef, {
        ...item,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });

    await Promise.all(savePromises);

    return packingList;
  } catch (error) {
    console.error("Error generating packing list:", error);
    throw error;
  }
}

/**
 * 3. Retrieve existing packing list for a trip
 *
 * @param userId - User ID
 * @param tripId - Trip ID
 * @returns Promise<PackingListItem[]> - Existing packing list
 */
export async function getPackingListForTrip(userId: string, tripId: string): Promise<PackingListItem[]> {
  try {
    const packingListRef = collection(db, "users", userId, "trips", tripId, "packingList");
    const snapshot = await getDocs(packingListRef);

    const packingList: PackingListItem[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      packingList.push({
        id: doc.id,
        label: data.label || "",
        category: data.category || "other",
        source: data.source || "custom",
        campingType: data.campingType,
        weatherTags: data.weatherTags,
        isPacked: data.isPacked || false,
        isRemoved: data.isRemoved || false,
        quantity: data.quantity || 1,
        notes: data.notes,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      });
    });

    return packingList;
  } catch (error) {
    console.error("Error fetching packing list:", error);
    throw error;
  }
}

/**
 * 4. Update a packing list item (mark as packed, change quantity, etc.)
 *
 * @param userId - User ID
 * @param tripId - Trip ID
 * @param itemId - Item ID
 * @param updates - Partial updates to apply
 */
export async function updatePackingListItem(
  userId: string,
  tripId: string,
  itemId: string,
  updates: Partial<PackingListItem>
): Promise<void> {
  try {
    const itemRef = doc(db, "users", userId, "trips", tripId, "packingList", itemId);
    await setDoc(itemRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    console.error("Error updating packing list item:", error);
    throw error;
  }
}

/**
 * 5. Add a custom item to packing list
 *
 * @param userId - User ID
 * @param tripId - Trip ID
 * @param item - New item to add
 */
export async function addCustomPackingItem(
  userId: string,
  tripId: string,
  item: Omit<PackingListItem, "id" | "source" | "createdAt" | "updatedAt">
): Promise<PackingListItem> {
  try {
    const packingListRef = collection(db, "users", userId, "trips", tripId, "packingList");
    const newItemRef = doc(packingListRef);

    const newItem: PackingListItem = {
      ...item,
      id: newItemRef.id,
      source: "custom",
    };

    await setDoc(newItemRef, {
      ...newItem,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return newItem;
  } catch (error) {
    console.error("Error adding custom packing item:", error);
    throw error;
  }
}

/**
 * 6. Helper: Determine weather tags from weather forecast
 *
 * @param forecast - Array of daily forecasts with high/low temps and precipitation
 * @returns WeatherTag[] - Weather tags for packing list generation
 */
export function determineWeatherTags(forecast: Array<{ high: number; low: number; precipitation?: number }>): WeatherTag[] {
  const tags: WeatherTag[] = [];

  // Check for cold weather (any day below 50°F)
  const hasCold = forecast.some(day => day.low < 50);
  if (hasCold) tags.push("cold");

  // Check for hot weather (any day above 80°F)
  const hasHot = forecast.some(day => day.high > 80);
  if (hasHot) tags.push("hot");

  // Check for wet weather (any day with >30% precipitation)
  const hasWet = forecast.some(day => (day.precipitation || 0) > 30);
  if (hasWet) tags.push("wet");

  return tags;
}
