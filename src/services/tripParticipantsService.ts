/**
 * Trip Participants Firestore Service
 * Subcollection: trips/{tripId}/participants
 */

import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import firebaseApp from "../config/firebase";
import { TripParticipant, ParticipantRole, ParticipantWithRole } from "../types/campground";

const db = getFirestore(firebaseApp);

/**
 * Get all participants for a specific trip
 */
export async function getTripParticipants(tripId: string): Promise<TripParticipant[]> {
  const participantsRef = collection(db, "trips", tripId, "participants");

  try {
    const q = query(participantsRef, orderBy("createdAt", "asc"));

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as TripParticipant[];
  } catch (error: any) {
    console.error("Error fetching trip participants:", error);

    // Fallback: try without orderBy if index is missing
    if (error.code === "failed-precondition" || error.message?.includes("index")) {
      const snapshot = await getDocs(participantsRef);

      const participants = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TripParticipant[];

      // Sort client-side
      return participants.sort((a, b) => {
        const aTime = typeof a.createdAt === "string"
          ? new Date(a.createdAt)
          : a.createdAt?.toDate?.() || new Date();
        const bTime = typeof b.createdAt === "string"
          ? new Date(b.createdAt)
          : b.createdAt?.toDate?.() || new Date();
        return aTime.getTime() - bTime.getTime();
      });
    }

    throw error;
  }
}

/**
 * Add participants to a trip with roles
 */
export async function addTripParticipantsWithRoles(
  tripId: string,
  participantsWithRoles: ParticipantWithRole[],
  tripStartDate?: Date
): Promise<void> {
  const participantsRef = collection(db, "trips", tripId, "participants");

  // Add each contact as a participant with their role
  await Promise.all(
    participantsWithRoles.map(async ({ contactId, role }) => {
      await addDoc(participantsRef, {
        campgroundContactId: contactId,
        role,
        createdAt: serverTimestamp(),
      });
    })
  );
}

/**
 * Update a participant's role
 */
export async function updateParticipantRole(
  tripId: string,
  participantId: string,
  role: ParticipantRole
): Promise<void> {
  const participantRef = doc(db, "trips", tripId, "participants", participantId);
  await updateDoc(participantRef, { role });
}

/**
 * Add participants to a trip (legacy - uses default guest role)
 */
export async function addTripParticipants(
  tripId: string,
  contactIds: string[]
): Promise<void> {
  const participantsWithRoles = contactIds.map(contactId => ({
    contactId,
    role: "guest" as ParticipantRole,
  }));

  await addTripParticipantsWithRoles(tripId, participantsWithRoles);
}

/**
 * Remove a participant from a trip
 */
export async function removeTripParticipant(
  tripId: string,
  participantId: string
): Promise<void> {
  const participantRef = doc(db, "trips", tripId, "participants", participantId);
  await deleteDoc(participantRef);
}
