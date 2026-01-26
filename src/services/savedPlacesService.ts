/**
 * Saved Places Service
 * Manages user-created custom campgrounds at /users/{userId}/savedPlaces/{placeId}
 * Separate from Favorite Parks (bookmarked parks from browse)
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "../config/firebase";

export type PlaceType = "campground" | "park" | "trailhead" | "other";

export interface SavedPlace {
  placeId: string;
  name: string;
  placeType: PlaceType;
  source: "user";
  locationText?: string;
  address?: string;
  lat?: number;
  lon?: number;
  url?: string;
  notes?: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface SavedPlaceInput {
  name: string;
  placeType?: PlaceType;
  locationText?: string;
  address?: string;
  lat?: number;
  lon?: number;
  url?: string;
  notes?: string;
}

/**
 * Get saved places collection reference for a user
 */
function getSavedPlacesCollection(userId: string) {
  return collection(db, "users", userId, "savedPlaces");
}

/**
 * Add a new saved place
 */
export async function addSavedPlace(
  userId: string,
  placeData: SavedPlaceInput
): Promise<string> {
  const placesRef = getSavedPlacesCollection(userId);
  const placeId = `${userId}_${Date.now()}`;

  const newPlace: Omit<SavedPlace, "placeId"> = {
    name: placeData.name.trim(),
    placeType: placeData.placeType || "campground",
    source: "user",
    locationText: placeData.locationText?.trim() || undefined,
    address: placeData.address?.trim() || undefined,
    lat: placeData.lat,
    lon: placeData.lon,
    url: placeData.url?.trim() || undefined,
    notes: placeData.notes?.trim() || undefined,
    createdAt: serverTimestamp() as Timestamp,
    updatedAt: serverTimestamp() as Timestamp,
  };

  await setDoc(doc(placesRef, placeId), { ...newPlace, placeId });
  return placeId;
}

/**
 * Get a single saved place
 */
export async function getSavedPlace(
  userId: string,
  placeId: string
): Promise<SavedPlace | null> {
  const placeRef = doc(db, "users", userId, "savedPlaces", placeId);
  const placeSnap = await getDoc(placeRef);

  if (!placeSnap.exists()) {
    return null;
  }

  return {
    placeId: placeSnap.id,
    ...placeSnap.data(),
  } as SavedPlace;
}

/**
 * Get all saved places for a user
 */
export async function getSavedPlaces(userId: string): Promise<SavedPlace[]> {
  const placesRef = getSavedPlacesCollection(userId);
  const q = query(placesRef, orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    placeId: doc.id,
    ...doc.data(),
  })) as SavedPlace[];
}

/**
 * Listen to saved places changes in real-time
 */
export function listenToSavedPlaces(
  userId: string,
  callback: (places: SavedPlace[]) => void
): () => void {
  const placesRef = getSavedPlacesCollection(userId);
  const q = query(placesRef, orderBy("createdAt", "desc"));

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const places = snapshot.docs.map((doc) => ({
        placeId: doc.id,
        ...doc.data(),
      })) as SavedPlace[];
      callback(places);
    },
    (error) => {
      console.error("[savedPlacesService] Error listening to saved places:", error);
      callback([]);
    }
  );

  return unsubscribe;
}

/**
 * Update a saved place
 */
export async function updateSavedPlace(
  userId: string,
  placeId: string,
  updates: Partial<SavedPlaceInput>
): Promise<void> {
  const placeRef = doc(db, "users", userId, "savedPlaces", placeId);

  const updateData: Record<string, any> = {
    ...updates,
    updatedAt: serverTimestamp(),
  };

  // Clean up undefined values
  Object.keys(updateData).forEach((key) => {
    if (updateData[key] === undefined) {
      delete updateData[key];
    }
  });

  await setDoc(placeRef, updateData, { merge: true });
}

/**
 * Remove a saved place
 */
export async function removeSavedPlace(
  userId: string,
  placeId: string
): Promise<void> {
  const placeRef = doc(db, "users", userId, "savedPlaces", placeId);
  await deleteDoc(placeRef);
}
