/**
 * Trips Store - Firebase-synced Zustand store
 * 
 * This store syncs trips with Firebase Firestore:
 * - Trips are stored in top-level /trips collection
 * - Users can see trips they own (userId) or are members of (memberIds)
 * - All mutations write to Firebase first, then update local state
 * - Shared trips (where user is member, not owner) are read-only
 */

import { create } from "zustand";
import {
  collection,
  doc,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  Unsubscribe,
} from "firebase/firestore";
import { db, auth } from "../config/firebase";
import { Trip, TripStatus } from "../types/camping";
import { trackCoreAction } from "../services/userActionTrackerService";

// Re-export Trip type for backwards compatibility
export type { Trip };

const TRIPS_COLLECTION = "trips";

interface TripsState {
  trips: Trip[];
  loading: boolean;
  initialized: boolean;
  
  // Core CRUD operations (Firebase-synced)
  addTrip: (trip: Omit<Trip, "id" | "createdAt" | "updatedAt" | "userId">) => Promise<string>;
  updateTrip: (id: string, updates: Partial<Trip>) => Promise<void>;
  deleteTrip: (id: string) => Promise<void>;
  
  // Getters
  getTripById: (id: string) => Trip | undefined;
  getTripsByStatus: (status: TripStatus) => Trip[];
  isSharedTrip: (tripId: string) => boolean;
  canEditTrip: (tripId: string) => boolean;
  
  // Convenience update methods (Firebase-synced)
  updateTripPacking: (id: string, packing: Trip["packing"]) => Promise<void>;
  updateTripMeals: (id: string, meals: Trip["meals"]) => Promise<void>;
  updateTripNotes: (id: string, notes: string) => Promise<void>;
  updateTripWeather: (id: string, weather: Trip["weather"]) => Promise<void>;
  setTripDestination: (id: string, destination: Trip["tripDestination"], parkId?: string) => Promise<void>;
  
  // Firebase sync methods
  loadTrips: () => Promise<void>;
  subscribeToTrips: () => Unsubscribe | null;
  clearTrips: () => void;
  
  // Internal state setters
  _setTrips: (trips: Trip[]) => void;
  _setLoading: (loading: boolean) => void;
}

const getTripStatus = (startDate: string, endDate: string): TripStatus => {
  const now = new Date();
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (now > end) return "completed";
  if (now < start) return "upcoming";
  return "active";
};

export const useTripsStore = create<TripsState>()((set, get) => ({
  trips: [],
  loading: false,
  initialized: false,

  /**
   * Add a new trip to Firebase
   * Returns the new trip ID
   */
  addTrip: async (tripData) => {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      console.error("[TripsStore] Cannot add trip: user not authenticated");
      throw new Error("User must be authenticated to create a trip");
    }

    const now = new Date().toISOString();
    const newTripData = {
      ...tripData,
      userId,
      memberIds: [], // Initialize empty members array
      status: tripData.status || "planning",
      createdAt: now,
      updatedAt: now,
    };

    try {
      // Write to Firebase first
      const tripsRef = collection(db, TRIPS_COLLECTION);
      const docRef = await addDoc(tripsRef, newTripData);
      
      // Create the full trip object with ID
      const newTrip: Trip = {
        ...newTripData,
        id: docRef.id,
      };

      // Update local state
      set((state) => ({
        trips: [newTrip, ...state.trips],
      }));

      // Track trip creation for paywall gating (increments tripsCreatedCount)
      trackCoreAction(userId, "trip_created");

      console.log("[TripsStore] Trip created:", docRef.id);
      return docRef.id;
    } catch (error) {
      console.error("[TripsStore] Failed to create trip:", error);
      throw error;
    }
  },

  /**
   * Update an existing trip in Firebase
   * Only trip owner can update
   */
  updateTrip: async (id, updates) => {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      console.error("[TripsStore] Cannot update trip: user not authenticated");
      return;
    }

    // Check if user can edit this trip
    if (!get().canEditTrip(id)) {
      console.warn("[TripsStore] Cannot edit shared trip:", id);
      return;
    }

    try {
      const tripRef = doc(db, TRIPS_COLLECTION, id);
      await updateDoc(tripRef, {
        ...updates,
        updatedAt: new Date().toISOString(),
      });

      // Update local state
      set((state) => ({
        trips: state.trips.map((trip) =>
          trip.id === id
            ? { ...trip, ...updates, updatedAt: new Date().toISOString() }
            : trip
        ),
      }));

      console.log("[TripsStore] Trip updated:", id);
    } catch (error) {
      console.error("[TripsStore] Failed to update trip:", error);
      throw error;
    }
  },

  /**
   * Delete a trip from Firebase
   * Only trip owner can delete owned trips
   * Members can remove themselves (remove from their view)
   */
  deleteTrip: async (id) => {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      console.error("[TripsStore] Cannot delete trip: user not authenticated");
      return;
    }

    const trip = get().getTripById(id);
    if (!trip) {
      console.warn("[TripsStore] Trip not found:", id);
      return;
    }

    try {
      if (trip.userId === userId) {
        // Owner - delete the entire trip
        const tripRef = doc(db, TRIPS_COLLECTION, id);
        await deleteDoc(tripRef);
        console.log("[TripsStore] Trip deleted:", id);
      } else {
        // Member - remove self from memberIds
        const tripRef = doc(db, TRIPS_COLLECTION, id);
        const currentMembers = trip.memberIds || [];
        await updateDoc(tripRef, {
          memberIds: currentMembers.filter((memberId) => memberId !== userId),
          updatedAt: new Date().toISOString(),
        });
        console.log("[TripsStore] Removed self from trip:", id);
      }

      // Update local state
      set((state) => ({
        trips: state.trips.filter((t) => t.id !== id),
      }));
    } catch (error) {
      console.error("[TripsStore] Failed to delete trip:", error);
      throw error;
    }
  },

  getTripById: (id) => {
    return get().trips.find((trip) => trip.id === id);
  },

  getTripsByStatus: (status) => {
    return get().trips.filter((trip) => {
      const tripStatus = getTripStatus(trip.startDate, trip.endDate);
      return tripStatus === status;
    });
  },

  /**
   * Check if a trip is shared (user is member, not owner)
   */
  isSharedTrip: (tripId) => {
    const userId = auth.currentUser?.uid;
    const trip = get().getTripById(tripId);
    if (!trip || !userId) return false;
    return trip.userId !== userId;
  },

  /**
   * Check if current user can edit a trip (must be owner)
   */
  canEditTrip: (tripId) => {
    const userId = auth.currentUser?.uid;
    const trip = get().getTripById(tripId);
    if (!trip || !userId) return false;
    return trip.userId === userId;
  },

  updateTripPacking: async (id, packing) => {
    await get().updateTrip(id, { packing });
  },

  updateTripMeals: async (id, meals) => {
    await get().updateTrip(id, { meals });
  },

  updateTripNotes: async (id, notes) => {
    await get().updateTrip(id, { notes });
  },

  updateTripWeather: async (id, weather) => {
    await get().updateTrip(id, { weather });
  },

  setTripDestination: async (id, destination, parkId) => {
    await get().updateTrip(id, {
      tripDestination: destination,
      parkId: parkId || destination?.placeId || undefined,
    });
  },

  /**
   * Load trips from Firebase (one-time fetch)
   * Loads both owned trips and shared trips
   */
  loadTrips: async () => {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      console.log("[TripsStore] No user, clearing trips");
      set({ trips: [], loading: false, initialized: true });
      return;
    }

    set({ loading: true });

    try {
      // Query for trips where user is owner OR member
      // Note: Firestore requires composite index for OR queries with array-contains
      // We'll do two queries and merge results
      
      // Query 1: Trips owned by user
      const ownedQuery = query(
        collection(db, TRIPS_COLLECTION),
        where("userId", "==", userId),
        orderBy("startDate", "desc")
      );
      
      // Query 2: Trips where user is a member
      const sharedQuery = query(
        collection(db, TRIPS_COLLECTION),
        where("memberIds", "array-contains", userId)
      );

      const [ownedSnapshot, sharedSnapshot] = await Promise.all([
        getDocs(ownedQuery),
        getDocs(sharedQuery),
      ]);

      const trips: Trip[] = [];
      const seenIds = new Set<string>();

      // Add owned trips
      ownedSnapshot.docs.forEach((doc) => {
        if (!seenIds.has(doc.id)) {
          seenIds.add(doc.id);
          trips.push({ id: doc.id, ...doc.data() } as Trip);
        }
      });

      // Add shared trips
      sharedSnapshot.docs.forEach((doc) => {
        if (!seenIds.has(doc.id)) {
          seenIds.add(doc.id);
          trips.push({ id: doc.id, ...doc.data() } as Trip);
        }
      });

      // Sort by startDate descending
      trips.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

      set({ trips, loading: false, initialized: true });
      console.log("[TripsStore] Loaded", trips.length, "trips from Firebase");
    } catch (error) {
      console.error("[TripsStore] Failed to load trips:", error);
      set({ loading: false, initialized: true });
    }
  },

  /**
   * Subscribe to real-time trip updates
   * Returns unsubscribe function
   */
  subscribeToTrips: () => {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      console.log("[TripsStore] No user, cannot subscribe");
      return null;
    }

    // Subscribe to owned trips
    const ownedQuery = query(
      collection(db, TRIPS_COLLECTION),
      where("userId", "==", userId),
      orderBy("startDate", "desc")
    );

    const unsubscribe = onSnapshot(ownedQuery, async () => {
      // When owned trips change, reload all trips to include shared ones
      await get().loadTrips();
    });

    console.log("[TripsStore] Subscribed to trips");
    return unsubscribe;
  },

  clearTrips: () => {
    set({ trips: [], loading: false, initialized: false });
  },

  _setTrips: (trips) => set({ trips }),
  _setLoading: (loading) => set({ loading }),
}));

// Selector hooks (backwards compatible)
export const useTrips = () => useTripsStore((s) => s.trips);
export const useTripsLoading = () => useTripsStore((s) => s.loading);
export const useTripsInitialized = () => useTripsStore((s) => s.initialized);
export const useCreateTrip = () => useTripsStore((s) => s.addTrip);
export const useUpdateTrip = () => useTripsStore((s) => s.updateTrip);
export const useDeleteTrip = () => useTripsStore((s) => s.deleteTrip);
export const useLoadTrips = () => useTripsStore((s) => s.loadTrips);
export const useIsSharedTrip = () => useTripsStore((s) => s.isSharedTrip);
export const useCanEditTrip = () => useTripsStore((s) => s.canEditTrip);
