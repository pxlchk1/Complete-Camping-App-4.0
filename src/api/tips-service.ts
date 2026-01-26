import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  writeBatch,
  increment,
  Timestamp,
} from "firebase/firestore";
import { db } from "../config/firebase";

const TIPS_COLLECTION = "tips";
const TIP_COMMENTS_COLLECTION = "tipComments";

// Tip interface matching actual Firestore structure
export interface Tip {
  id: string;
  text: string;
  body?: string; // Alias for text in some contexts
  userId: string;
  createdAt: Timestamp | any;
  images?: string[];
  likesCount?: number;
  score?: number; // upvotes - downvotes, if voting enabled
}

export interface TipComment {
  id: string;
  tipId: string;
  text: string;
  userId: string;
  createdAt: Timestamp | any;
}

// Create a new tip
export async function createTip(
  text: string,
  userId: string,
  images?: string[]
): Promise<string> {
  try {
    const tipDoc = {
      text,
      userId,
      createdAt: Timestamp.now(),
      images: images || [],
      likesCount: 0,
    };

    const docRef = await addDoc(collection(db, TIPS_COLLECTION), tipDoc);
    return docRef.id;
  } catch (error) {
    console.error("Error creating tip:", error);
    throw error;
  }
}

// Get all tips
export async function getTips(): Promise<Tip[]> {
  try {
    const q = query(
      collection(db, TIPS_COLLECTION),
      orderBy("createdAt", "desc"),
      limit(100)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Tip[];
  } catch (error) {
    console.error("Error fetching tips:", error);
    return [];
  }
}

// Get a single tip by ID
export async function getTipById(tipId: string): Promise<Tip | null> {
  try {
    const docRef = doc(db, TIPS_COLLECTION, tipId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data(),
      } as Tip;
    }
    return null;
  } catch (error) {
    console.error("Error fetching tip:", error);
    return null;
  }
}

// Get comments for a tip
export async function getTipComments(tipId: string): Promise<TipComment[]> {
  try {
    const q = query(
      collection(db, TIP_COMMENTS_COLLECTION),
      where("tipId", "==", tipId),
      orderBy("createdAt", "asc")
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as TipComment[];
  } catch (error) {
    console.error("Error fetching tip comments:", error);
    return [];
  }
}

// Add comment to tip
export async function addTipComment(
  tipId: string,
  text: string,
  userId: string
): Promise<string> {
  try {
    const commentDoc = {
      tipId,
      text,
      userId,
      createdAt: Timestamp.now(),
    };

    const docRef = await addDoc(collection(db, TIP_COMMENTS_COLLECTION), commentDoc);
    return docRef.id;
  } catch (error) {
    console.error("Error adding tip comment:", error);
    throw error;
  }
}

// Delete a tip
export async function deleteTip(tipId: string, userId: string): Promise<void> {
  try {
    const tipRef = doc(db, TIPS_COLLECTION, tipId);
    const tipDoc = await getDoc(tipRef);

    if (!tipDoc.exists()) {
      throw new Error("Tip not found");
    }

    if (tipDoc.data().userId !== userId) {
      throw new Error("Unauthorized to delete this tip");
    }

    await deleteDoc(tipRef);
  } catch (error) {
    console.error("Error deleting tip:", error);
    throw error;
  }
}

// Like/unlike a tip
export async function toggleTipLike(tipId: string, userId: string): Promise<void> {
  try {
    const tipRef = doc(db, TIPS_COLLECTION, tipId);
    const batch = writeBatch(db);

    // For now, just increment the like count
    // In a full implementation, you'd track user likes in a separate collection
    batch.update(tipRef, { likesCount: increment(1) });

    await batch.commit();
  } catch (error) {
    console.error("Error toggling tip like:", error);
    throw error;
  }
}

// Get tips by user
export async function getTipsByUser(userId: string): Promise<Tip[]> {
  try {
    const q = query(
      collection(db, TIPS_COLLECTION),
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Tip[];
  } catch (error) {
    console.error("Error fetching user tips:", error);
    return [];
  }
}
