/**
 * Favorite Parks Service
 * Manages user's favorite parks in Firestore
 * Path: /users/{userId}/favoriteParks/{parkId}
 */

import { db } from "../config/firebase";
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  query,
  orderBy,
  getDocs,
  onSnapshot,
  serverTimestamp,
  Unsubscribe,
} from "firebase/firestore";
import { Park } from "../types/camping";
import { trackSavedPlaceAdded } from "./analyticsService";
import { trackCoreAction } from "./userActionTrackerService";

/**
 * Favorite park snapshot stored in Firestore
 * Minimal data for rendering favorites without re-fetching full park data
 */
export interface FavoritePark {
  parkId: string;
  name: string;
  type: "State Park" | "National Park" | "National Forest" | string;
  state?: string;
  thumbnailUrl?: string;
  lat?: number;
  lon?: number;
  createdAt: any;
}

/**
 * Convert park filter to display type
 */
function getTypeLabel(filter: Park["filter"]): string {
  switch (filter) {
    case "state_park":
      return "State Park";
    case "national_park":
      return "National Park";
    case "national_forest":
      return "National Forest";
    default:
      return "Park";
  }
}

/**
 * Check if a park is favorited by the user
 */
export async function isParkFavorited(
  userId: string,
  parkId: string
): Promise<boolean> {
  try {
    const favRef = doc(db, "users", userId, "favoriteParks", parkId);
    const favSnap = await getDoc(favRef);
    return favSnap.exists();
  } catch (error) {
    console.error("[FavoriteParks] Error checking favorite:", error);
    return false;
  }
}

/**
 * Add a park to user's favorites
 */
export async function addFavoritePark(
  userId: string,
  park: Park
): Promise<void> {
  try {
    const favRef = doc(db, "users", userId, "favoriteParks", park.id);
    
    const favoritePark: FavoritePark = {
      parkId: park.id,
      name: park.name,
      type: getTypeLabel(park.filter),
      state: park.state,
      // thumbnailUrl omitted - parks don't have thumbnails yet (Firestore doesn't allow undefined)
      lat: park.latitude,
      lon: park.longitude,
      createdAt: serverTimestamp(),
    };

    await setDoc(favRef, favoritePark);
    console.log("[FavoriteParks] Added favorite:", park.name);

    // Track analytics and core action
    trackSavedPlaceAdded("park");
    trackCoreAction(userId, "saved_place_added");
  } catch (error) {
    console.error("[FavoriteParks] Error adding favorite:", error);
    throw error;
  }
}

/**
 * Remove a park from user's favorites
 */
export async function removeFavoritePark(
  userId: string,
  parkId: string
): Promise<void> {
  try {
    const favRef = doc(db, "users", userId, "favoriteParks", parkId);
    await deleteDoc(favRef);
    console.log("[FavoriteParks] Removed favorite:", parkId);
  } catch (error) {
    console.error("[FavoriteParks] Error removing favorite:", error);
    throw error;
  }
}

/**
 * Toggle favorite status for a park
 */
export async function toggleFavoritePark(
  userId: string,
  park: Park
): Promise<boolean> {
  const isFav = await isParkFavorited(userId, park.id);
  
  if (isFav) {
    await removeFavoritePark(userId, park.id);
    return false;
  } else {
    await addFavoritePark(userId, park);
    return true;
  }
}

/**
 * Get all favorite parks for a user
 */
export async function getFavoriteParks(
  userId: string
): Promise<FavoritePark[]> {
  try {
    const favsRef = collection(db, "users", userId, "favoriteParks");
    const q = query(favsRef, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map((doc) => ({
      ...doc.data(),
      parkId: doc.id,
    })) as FavoritePark[];
  } catch (error) {
    console.error("[FavoriteParks] Error getting favorites:", error);
    return [];
  }
}

/**
 * Get count of favorite parks for a user
 * Used for gating - FREE users limited to 5 favorites
 */
export async function getFavoritesCount(userId: string): Promise<number> {
  try {
    const favsRef = collection(db, "users", userId, "favoriteParks");
    const snapshot = await getDocs(favsRef);
    return snapshot.size;
  } catch (error) {
    console.error("[FavoriteParks] Error counting favorites:", error);
    return 0;
  }
}

/**
 * FREE tier favorites limit
 */
export const FREE_FAVORITES_LIMIT = 5;

/**
 * Listen to a single park's favorite status
 */
export function listenToFavoritePark(
  userId: string,
  parkId: string,
  callback: (isFavorited: boolean) => void
): Unsubscribe {
  const favRef = doc(db, "users", userId, "favoriteParks", parkId);
  
  return onSnapshot(favRef, (snap) => {
    callback(snap.exists());
  });
}

/**
 * Listen to all favorite parks for a user
 */
export function listenToFavoriteParks(
  userId: string,
  callback: (favorites: FavoritePark[]) => void
): Unsubscribe {
  const favsRef = collection(db, "users", userId, "favoriteParks");
  const q = query(favsRef, orderBy("createdAt", "desc"));
  
  return onSnapshot(q, (snapshot) => {
    const favorites = snapshot.docs.map((doc) => ({
      ...doc.data(),
      parkId: doc.id,
    })) as FavoritePark[];
    
    callback(favorites);
  });
}
