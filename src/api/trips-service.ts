/**
 * Firebase service for trip management
 * Structure: /users/{userId}/trips/{tripId}
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
  Timestamp,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { Trip } from "../types/camping";

/**
 * Get all trips for a user
 */
export async function getUserTrips(userId: string): Promise<Trip[]> {
  try {
    const tripsRef = collection(db, "users", userId, "trips");
    const q = query(tripsRef, orderBy("startDate", "desc"));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Trip[];
  } catch (error) {
    console.error("Error fetching trips:", error);
    return [];
  }
}

/**
 * Get a single trip by ID
 */
export async function getTrip(userId: string, tripId: string): Promise<Trip | null> {
  try {
    const tripRef = doc(db, "users", userId, "trips", tripId);
    const snapshot = await getDoc(tripRef);

    if (!snapshot.exists()) {
      return null;
    }

    return {
      id: snapshot.id,
      ...snapshot.data(),
    } as Trip;
  } catch (error) {
    console.error("Error fetching trip:", error);
    return null;
  }
}

/**
 * Create a new trip
 */
export async function createTrip(userId: string, trip: Omit<Trip, "id" | "userId">): Promise<string> {
  try {
    const tripsRef = collection(db, "users", userId, "trips");
    const newTripRef = doc(tripsRef);

    const tripData = {
      ...trip,
      userId,
      createdAt: trip.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await setDoc(newTripRef, tripData);
    return newTripRef.id;
  } catch (error) {
    console.error("Error creating trip:", error);
    throw error;
  }
}

/**
 * Update a trip
 */
export async function updateTrip(
  userId: string,
  tripId: string,
  updates: Partial<Trip>
): Promise<void> {
  try {
    const tripRef = doc(db, "users", userId, "trips", tripId);
    await updateDoc(tripRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error updating trip:", error);
    throw error;
  }
}

/**
 * Delete a trip
 */
export async function deleteTrip(userId: string, tripId: string): Promise<void> {
  try {
    const tripRef = doc(db, "users", userId, "trips", tripId);
    await deleteDoc(tripRef);
  } catch (error) {
    console.error("Error deleting trip:", error);
    throw error;
  }
}
