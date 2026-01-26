/**
 * Campground Contacts Firestore Service
 * Collection: campgroundContacts
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
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import firebaseApp from "../config/firebase";
import { CampgroundContact, CreateContactData, UpdateContactData } from "../types/campground";

const db = getFirestore(firebaseApp);

/**
 * Get all campground contacts for a specific owner
 */
export async function getCampgroundContacts(ownerId: string): Promise<CampgroundContact[]> {
  const contactsRef = collection(db, "campgroundContacts");

  try {
    const q = query(
      contactsRef,
      where("ownerId", "==", ownerId),
      orderBy("createdAt", "desc")
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as CampgroundContact[];
  } catch (error: any) {
    console.error("Error fetching campground contacts:", error);

    // Fallback: try without orderBy if index is missing
    if (error.code === "failed-precondition" || error.message?.includes("index")) {
      const simpleQuery = query(contactsRef, where("ownerId", "==", ownerId));
      const snapshot = await getDocs(simpleQuery);

      const contacts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as CampgroundContact[];

      // Sort client-side by createdAt
      return contacts.sort((a, b) => {
        const timeA = typeof a.createdAt === 'string' ? new Date(a.createdAt).getTime() : a.createdAt.toMillis();
        const timeB = typeof b.createdAt === 'string' ? new Date(b.createdAt).getTime() : b.createdAt.toMillis();
        return timeB - timeA;
      });
    }

    throw error;
  }
}

/**
 * Get a single campground contact by ID
 */
export async function getCampgroundContactById(contactId: string): Promise<CampgroundContact | null> {
  const contactRef = doc(db, "campgroundContacts", contactId);
  const contactSnap = await getDoc(contactRef);

  if (!contactSnap.exists()) {
    return null;
  }

  return {
    id: contactSnap.id,
    ...contactSnap.data()
  } as CampgroundContact;
}

/**
 * Create a new campground contact
 */
export async function createCampgroundContact(
  ownerId: string,
  data: CreateContactData
): Promise<string> {
  const contactsRef = collection(db, "campgroundContacts");

  const docRef = await addDoc(contactsRef, {
    ownerId,
    contactUserId: null,
    contactName: data.contactName,
    contactEmail: data.contactEmail || null,
    contactPhone: data.contactPhone || null,
    contactNote: data.contactNote || null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
}

/**
 * Update an existing campground contact
 */
export async function updateCampgroundContact(
  contactId: string,
  data: UpdateContactData
): Promise<void> {
  const contactRef = doc(db, "campgroundContacts", contactId);

  const updateData: any = {
    updatedAt: serverTimestamp(),
  };

  if (data.contactName !== undefined) updateData.contactName = data.contactName;
  if (data.contactEmail !== undefined) updateData.contactEmail = data.contactEmail;
  if (data.contactPhone !== undefined) updateData.contactPhone = data.contactPhone;
  if (data.contactNote !== undefined) updateData.contactNote = data.contactNote;

  await updateDoc(contactRef, updateData);
}

/**
 * Delete a campground contact
 */
export async function deleteCampgroundContact(contactId: string): Promise<void> {
  const contactRef = doc(db, "campgroundContacts", contactId);
  await deleteDoc(contactRef);
}
