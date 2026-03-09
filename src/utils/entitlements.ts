/**
 * Entitlements Module
 * Central module for managing free vs premium access logic
 * 
 * Business Rules:
 * - Free users get exactly ONE "free premium access trip" with packing/meals
 * - Free users cannot customize packing or meals even in the free trip
 * - Premium users get unlimited trips and full customization
 * - Feedback is unlocked for all users
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSubscriptionStore } from "../state/subscriptionStore";
import { useUserStore } from "../state/userStore";
import { auth } from "../config/firebase";
import { Trip } from "../types/camping";

// Storage key for free premium trip ID
const getFreePremiumTripKey = (userId: string) => `freePremiumTripId:${userId}`;

/**
 * Check if user is premium (has Pro subscription, or is admin/moderator)
 */
export function isPremiumUser(): boolean {
  // Admin and moderator users always have premium access
  const userState = useUserStore.getState();
  if (userState.isAdministrator() || userState.isModerator()) {
    return true;
  }

  return useSubscriptionStore.getState().isPro;
}

/**
 * Get the free premium trip ID for a user
 * Returns null if not set
 */
export async function getFreePremiumTripId(userId: string): Promise<string | null> {
  try {
    const tripId = await AsyncStorage.getItem(getFreePremiumTripKey(userId));
    return tripId;
  } catch (error) {
    console.error("[Entitlements] Failed to get free premium trip ID:", error);
    return null;
  }
}

/**
 * Set the free premium trip ID for a user
 */
export async function setFreePremiumTripId(userId: string, tripId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(getFreePremiumTripKey(userId), tripId);
    console.log("[Entitlements] Set free premium trip ID:", tripId);
  } catch (error) {
    console.error("[Entitlements] Failed to set free premium trip ID:", error);
  }
}

/**
 * Clear the free premium trip ID for a user
 */
export async function clearFreePremiumTripId(userId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(getFreePremiumTripKey(userId));
    console.log("[Entitlements] Cleared free premium trip ID");
  } catch (error) {
    console.error("[Entitlements] Failed to clear free premium trip ID:", error);
  }
}

/**
 * Ensure free premium trip ID is set
 * If not set and trips exist, sets to earliest created trip
 * If stored trip ID no longer exists, sets to new earliest
 * Returns the trip ID or null if no trips
 */
export async function ensureFreePremiumTripId(
  userId: string,
  trips: Trip[]
): Promise<string | null> {
  try {
    const currentTripId = await getFreePremiumTripId(userId);
    
    // Filter trips owned by this user
    const userTrips = trips.filter(t => t.userId === userId);
    
    if (userTrips.length === 0) {
      // No trips - clear any stale ID and return null
      if (currentTripId) {
        await clearFreePremiumTripId(userId);
      }
      return null;
    }
    
    // Check if current trip ID is still valid
    const currentTripExists = userTrips.some(t => t.id === currentTripId);
    
    if (currentTripId && currentTripExists) {
      // Current trip still exists, keep it
      return currentTripId;
    }
    
    // Need to set a new free trip - use earliest created trip
    const sortedTrips = [...userTrips].sort((a, b) => {
      const aDate = new Date(a.createdAt || 0).getTime();
      const bDate = new Date(b.createdAt || 0).getTime();
      return aDate - bDate;
    });
    
    const earliestTrip = sortedTrips[0];
    await setFreePremiumTripId(userId, earliestTrip.id);
    
    return earliestTrip.id;
  } catch (error) {
    console.error("[Entitlements] Failed to ensure free premium trip ID:", error);
    return null;
  }
}

/**
 * Check if user can access packing and meals for a trip
 * - Premium users: always true
 * - Free users: only if trip is their free premium trip
 */
export async function canAccessPackingAndMeals(
  tripId: string,
  trips: Trip[]
): Promise<boolean> {
  // Premium users can always access
  if (isPremiumUser()) {
    return true;
  }
  
  const userId = auth.currentUser?.uid;
  if (!userId) {
    return false;
  }
  
  // Ensure free trip is set and get the ID
  const freeTripId = await ensureFreePremiumTripId(userId, trips);
  
  // Free users can only access their free premium trip
  return tripId === freeTripId;
}

/**
 * Check if user can customize packing for a trip
 * - Premium users: always true
 * - Free users: always false (even for free trip)
 */
export async function canCustomizePacking(tripId: string): Promise<boolean> {
  // Only premium users can customize
  return isPremiumUser();
}

/**
 * Check if user can customize meals for a trip
 * - Premium users: always true
 * - Free users: always false (even for free trip)
 */
export async function canCustomizeMeals(tripId: string): Promise<boolean> {
  // Only premium users can customize
  return isPremiumUser();
}

/**
 * Check if user can access feedback
 * Always returns true - feedback is unlocked for all users
 */
export function canAccessFeedback(): boolean {
  return true;
}

/**
 * Hook-friendly version to check if a trip is the free premium trip
 * For use in components that need synchronous checks
 */
export function isFreePremiumTrip(
  tripId: string,
  freePremiumTripId: string | null
): boolean {
  return tripId === freePremiumTripId;
}
