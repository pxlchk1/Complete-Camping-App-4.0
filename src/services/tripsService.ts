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
  Timestamp,
  writeBatch,
} from "firebase/firestore";
import { db } from "../config/firebase";
import type { Trip } from "../types/camping";

const TRIPS_COLLECTION = "users";

/**
 * Get trips collection reference for a user
 */
function getTripsCollection(userId: string) {
  return collection(db, TRIPS_COLLECTION, userId, "trips");
}

/**
 * Create a new trip
 */
export async function createTrip(
  userId: string,
  tripData: Omit<Trip, "id" | "createdAt" | "updatedAt">
): Promise<string> {
  const tripsRef = getTripsCollection(userId);
  const now = new Date().toISOString();

  const newTrip = {
    ...tripData,
    userId,
    createdAt: now,
    updatedAt: now,
  };

  const docRef = await addDoc(tripsRef, newTrip);
  return docRef.id;
}

/**
 * Get a single trip by ID
 */
export async function getTrip(userId: string, tripId: string): Promise<Trip | null> {
  const tripRef = doc(db, TRIPS_COLLECTION, userId, "trips", tripId);
  const tripDoc = await getDoc(tripRef);

  if (!tripDoc.exists()) {
    return null;
  }

  return {
    id: tripDoc.id,
    ...tripDoc.data(),
  } as Trip;
}

/**
 * Get all trips for a user
 */
export async function getUserTrips(userId: string): Promise<Trip[]> {
  const tripsRef = getTripsCollection(userId);
  const q = query(tripsRef, orderBy("startDate", "desc"));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Trip[];
}

/**
 * Get trips filtered by status
 */
export async function getTripsByStatus(
  userId: string,
  status: "active" | "completed" | "upcoming"
): Promise<Trip[]> {
  const trips = await getUserTrips(userId);
  const now = new Date();

  return trips.filter((trip) => {
    const start = new Date(trip.startDate);
    const end = new Date(trip.endDate);

    if (status === "active") {
      return now >= start && now <= end;
    } else if (status === "upcoming") {
      return now < start;
    } else if (status === "completed") {
      return now > end;
    }
    return true;
  });
}

/**
 * Update a trip
 */
export async function updateTrip(
  userId: string,
  tripId: string,
  updates: Partial<Trip>
): Promise<void> {
  const tripRef = doc(db, TRIPS_COLLECTION, userId, "trips", tripId);
  await updateDoc(tripRef, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Delete a trip and all its sub-collections
 */
export async function deleteTrip(userId: string, tripId: string): Promise<void> {
  const batch = writeBatch(db);

  // Delete the trip document
  const tripRef = doc(db, TRIPS_COLLECTION, userId, "trips", tripId);
  batch.delete(tripRef);

  // Delete packing list items
  const packingRef = collection(db, TRIPS_COLLECTION, userId, "trips", tripId, "packingList");
  const packingSnapshot = await getDocs(packingRef);
  packingSnapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });

  // Delete meals
  const mealsRef = collection(db, TRIPS_COLLECTION, userId, "trips", tripId, "meals");
  const mealsSnapshot = await getDocs(mealsRef);
  mealsSnapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });

  await batch.commit();
}

/**
 * Subscribe to real-time trip updates
 */
export function subscribeToTrips(
  userId: string,
  callback: (trips: Trip[]) => void
): () => void {
  const tripsRef = getTripsCollection(userId);
  const q = query(tripsRef, orderBy("startDate", "desc"));

  return onSnapshot(q, (snapshot) => {
    const trips = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Trip[];
    callback(trips);
  });
}

/**
 * Subscribe to a single trip
 */
export function subscribeToTrip(
  userId: string,
  tripId: string,
  callback: (trip: Trip | null) => void
): () => void {
  const tripRef = doc(db, TRIPS_COLLECTION, userId, "trips", tripId);

  return onSnapshot(tripRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback(null);
      return;
    }

    callback({
      id: snapshot.id,
      ...snapshot.data(),
    } as Trip);
  });
}
