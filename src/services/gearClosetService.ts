/**
 * Gear Closet Firestore Service
 * Collection: userGear
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
import { ref, uploadBytes, getDownloadURL, deleteObject, listAll } from "firebase/storage";
import firebaseApp, { storage } from "../config/firebase";
import { GearItem, CreateGearData, UpdateGearData } from "../types/gear";

const db = getFirestore(firebaseApp);

/**
 * Get all gear items for a specific owner
 */
export async function getUserGear(ownerId: string): Promise<GearItem[]> {
  const gearRef = collection(db, "userGear");

  try {
    const q = query(
      gearRef,
      where("ownerId", "==", ownerId),
      orderBy("createdAt", "desc")
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as GearItem[];
  } catch (error: any) {
    console.error("Error fetching user gear:", error);

    // Fallback: try without orderBy if index is missing
    if (error.code === "failed-precondition" || error.message?.includes("index")) {
      const simpleQuery = query(gearRef, where("ownerId", "==", ownerId));
      const snapshot = await getDocs(simpleQuery);

      const gear = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as GearItem[];

      // Sort client-side by createdAt
      return gear.sort((a, b) => {
        const timeA = typeof a.createdAt === 'string' ? new Date(a.createdAt).getTime() : a.createdAt.toMillis();
        const timeB = typeof b.createdAt === 'string' ? new Date(b.createdAt).getTime() : b.createdAt.toMillis();
        return timeB - timeA;
      });
    }

    throw error;
  }
}

/**
 * Get a single gear item by ID
 */
export async function getGearItemById(gearId: string): Promise<GearItem | null> {
  const gearRef = doc(db, "userGear", gearId);
  const gearSnap = await getDoc(gearRef);

  if (!gearSnap.exists()) {
    return null;
  }

  return {
    id: gearSnap.id,
    ...gearSnap.data()
  } as GearItem;
}

/**
 * Create a new gear item
 */
export async function createGearItem(
  ownerId: string,
  data: CreateGearData
): Promise<string> {
  const gearRef = collection(db, "userGear");

  const docRef = await addDoc(gearRef, {
    ownerId,
    name: data.name,
    category: data.category,
    brand: data.brand || null,
    model: data.model || null,
    weight: data.weight || null,
    notes: data.notes || null,
    imageUrl: data.imageUrl || null,
    isFavorite: data.isFavorite || false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
}

/**
 * Update an existing gear item
 */
export async function updateGearItem(
  gearId: string,
  data: UpdateGearData
): Promise<void> {
  const gearRef = doc(db, "userGear", gearId);

  const updateData: any = {
    updatedAt: serverTimestamp(),
  };

  if (data.name !== undefined) updateData.name = data.name;
  if (data.category !== undefined) updateData.category = data.category;
  if (data.brand !== undefined) updateData.brand = data.brand;
  if (data.model !== undefined) updateData.model = data.model;
  if (data.weight !== undefined) updateData.weight = data.weight;
  if (data.notes !== undefined) updateData.notes = data.notes;
  if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;
  if (data.isFavorite !== undefined) updateData.isFavorite = data.isFavorite;

  await updateDoc(gearRef, updateData);
}

/**
 * Delete a gear item
 */
export async function deleteGearItem(gearId: string): Promise<void> {
  const gearRef = doc(db, "userGear", gearId);
  await deleteDoc(gearRef);
}

/**
 * Upload gear image to Storage
 */
export async function uploadGearImage(
  userId: string,
  gearId: string,
  imageUri: string
): Promise<string> {
  try {
    // Fetch the image as a blob
    const response = await fetch(imageUri);
    const blob = await response.blob();

    // Create storage reference - matches Firebase Storage rules: gearCloset/{userId}/{gearId}/{fileName}
    const storageRef = ref(storage, `gearCloset/${userId}/${gearId}/${Date.now()}.jpg`);

    // Upload image
    await uploadBytes(storageRef, blob);

    // Get download URL
    const downloadURL = await getDownloadURL(storageRef);

    return downloadURL;
  } catch (error) {
    console.error("Error uploading gear image:", error);
    throw error;
  }
}

/**
 * Delete all images for a gear item
 */
export async function deleteGearImages(userId: string, gearId: string): Promise<void> {
  try {
    const folderRef = ref(storage, `gearCloset/${userId}/${gearId}`);
    const fileList = await listAll(folderRef);

    // Delete all files in the folder
    await Promise.all(
      fileList.items.map(fileRef => deleteObject(fileRef))
    );
  } catch (error) {
    console.error("Error deleting gear images:", error);
    // Don't throw - this is a cleanup operation
  }
}
