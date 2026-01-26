/**
 * Packing Data Repair Utility
 * 
 * Admin-only functions to normalize and repair legacy packing list data.
 * This ensures all items use canonical categoryKey from the enum.
 * 
 * Usage: Import and call from AdminContentScreen or a one-time script.
 */

import {
  collection,
  getDocs,
  doc,
  writeBatch,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { normalizeCategoryKey, isValidCategoryKey } from "../constants/packingCategories";

interface RepairResult {
  tripId: string;
  itemsScanned: number;
  itemsRepaired: number;
  errors: string[];
}

interface FullRepairResult {
  userId: string;
  tripsScanned: number;
  tripsRepaired: number;
  totalItemsScanned: number;
  totalItemsRepaired: number;
  errors: string[];
  details: RepairResult[];
}

/**
 * Repair a single trip's packing list items
 * - Adds categoryKey if missing (inferred from category/categoryId/categoryLabel)
 * - Normalizes existing categoryKey to canonical form
 */
export async function repairTripPackingList(
  userId: string,
  tripId: string
): Promise<RepairResult> {
  const result: RepairResult = {
    tripId,
    itemsScanned: 0,
    itemsRepaired: 0,
    errors: [],
  };

  try {
    const packingRef = collection(db, "users", userId, "trips", tripId, "packingList");
    const snapshot = await getDocs(packingRef);

    if (snapshot.empty) {
      return result;
    }

    const batch = writeBatch(db);
    let batchCount = 0;

    snapshot.docs.forEach((docSnap) => {
      result.itemsScanned++;
      const data = docSnap.data();
      
      // Determine the source field for category
      const existingKey = data.categoryKey;
      const categoryId = data.categoryId;
      const category = data.category;
      const categoryLabel = data.categoryLabel;
      
      // Find the best source to normalize from
      const sourceValue = existingKey || categoryId || category || categoryLabel;
      
      if (!sourceValue) {
        result.errors.push(`Item ${docSnap.id}: No category field found`);
        return;
      }

      const normalizedKey = normalizeCategoryKey(sourceValue);
      
      // Check if repair is needed
      const needsRepair = 
        !existingKey || // No categoryKey
        existingKey !== normalizedKey || // categoryKey not canonical
        !isValidCategoryKey(existingKey); // categoryKey invalid

      if (needsRepair) {
        const itemRef = doc(db, "users", userId, "trips", tripId, "packingList", docSnap.id);
        batch.update(itemRef, {
          categoryKey: normalizedKey,
          // Optionally clean up legacy fields
          // categoryLabel: deleteField(), // Uncomment to remove
        });
        batchCount++;
        result.itemsRepaired++;
      }
    });

    // Commit repairs if any
    if (batchCount > 0) {
      await batch.commit();
      console.log(`[PackingRepair] Repaired ${batchCount} items for trip ${tripId}`);
    }

  } catch (error: any) {
    result.errors.push(`Trip ${tripId}: ${error.message}`);
    console.error(`[PackingRepair] Error repairing trip ${tripId}:`, error);
  }

  return result;
}

/**
 * Repair all packing lists for a user
 */
export async function repairUserPackingLists(userId: string): Promise<FullRepairResult> {
  const result: FullRepairResult = {
    userId,
    tripsScanned: 0,
    tripsRepaired: 0,
    totalItemsScanned: 0,
    totalItemsRepaired: 0,
    errors: [],
    details: [],
  };

  try {
    const tripsRef = collection(db, "users", userId, "trips");
    const tripsSnapshot = await getDocs(tripsRef);

    for (const tripDoc of tripsSnapshot.docs) {
      result.tripsScanned++;
      const tripResult = await repairTripPackingList(userId, tripDoc.id);
      
      result.totalItemsScanned += tripResult.itemsScanned;
      result.totalItemsRepaired += tripResult.itemsRepaired;
      
      if (tripResult.itemsRepaired > 0) {
        result.tripsRepaired++;
      }
      
      if (tripResult.errors.length > 0) {
        result.errors.push(...tripResult.errors);
      }
      
      result.details.push(tripResult);
    }

    console.log(`[PackingRepair] User ${userId}: Repaired ${result.totalItemsRepaired} items across ${result.tripsRepaired} trips`);

  } catch (error: any) {
    result.errors.push(`User ${userId}: ${error.message}`);
    console.error(`[PackingRepair] Error repairing user ${userId}:`, error);
  }

  return result;
}

/**
 * Scan a trip's packing list and return stats without modifying
 * Use this to preview what would be repaired
 */
export async function scanTripPackingList(
  userId: string,
  tripId: string
): Promise<{
  totalItems: number;
  itemsNeedingRepair: number;
  issues: { itemId: string; issue: string; currentValue: string; suggestedFix: string }[];
}> {
  const result = {
    totalItems: 0,
    itemsNeedingRepair: 0,
    issues: [] as { itemId: string; issue: string; currentValue: string; suggestedFix: string }[],
  };

  try {
    const packingRef = collection(db, "users", userId, "trips", tripId, "packingList");
    const snapshot = await getDocs(packingRef);

    snapshot.docs.forEach((docSnap) => {
      result.totalItems++;
      const data = docSnap.data();
      
      const existingKey = data.categoryKey;
      const categoryId = data.categoryId;
      const category = data.category;
      const categoryLabel = data.categoryLabel;
      
      const sourceValue = existingKey || categoryId || category || categoryLabel;
      
      if (!sourceValue) {
        result.itemsNeedingRepair++;
        result.issues.push({
          itemId: docSnap.id,
          issue: "No category field found",
          currentValue: "undefined",
          suggestedFix: "tripSpecific",
        });
        return;
      }

      const normalizedKey = normalizeCategoryKey(sourceValue);
      
      if (!existingKey) {
        result.itemsNeedingRepair++;
        result.issues.push({
          itemId: docSnap.id,
          issue: "Missing categoryKey",
          currentValue: `category="${category}" / categoryId="${categoryId}"`,
          suggestedFix: normalizedKey,
        });
      } else if (existingKey !== normalizedKey) {
        result.itemsNeedingRepair++;
        result.issues.push({
          itemId: docSnap.id,
          issue: "categoryKey not canonical",
          currentValue: existingKey,
          suggestedFix: normalizedKey,
        });
      } else if (!isValidCategoryKey(existingKey)) {
        result.itemsNeedingRepair++;
        result.issues.push({
          itemId: docSnap.id,
          issue: "categoryKey not in enum",
          currentValue: existingKey,
          suggestedFix: normalizedKey,
        });
      }
    });

  } catch (error: any) {
    console.error(`[PackingRepair] Error scanning trip ${tripId}:`, error);
  }

  return result;
}
