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
  Timestamp,
} from "firebase/firestore";
import { db } from "../config/firebase";

const GEAR_REVIEWS_COLLECTION = "gearReviews";

// GearReview interface matching EXACT Firestore structure
export interface GearReview {
  id: string;
  title: string;
  brand: string;
  category: string;
  rating: number;
  text: string;
  imageUrl?: string;
  userId: string;
  createdAt: Timestamp | any;
  score?: number; // upvotes - downvotes, if voting enabled
}

// Create a gear review
export async function createGearReview(
  title: string,
  brand: string,
  category: string,
  rating: number,
  text: string,
  userId: string,
  imageUrl?: string
): Promise<string> {
  try {
    const reviewDoc = {
      title,
      brand,
      category,
      rating,
      text,
      imageUrl: imageUrl || "",
      userId,
      createdAt: Timestamp.now(),
    };

    const docRef = await addDoc(collection(db, GEAR_REVIEWS_COLLECTION), reviewDoc);
    return docRef.id;
  } catch (error) {
    console.error("Error creating gear review:", error);
    throw error;
  }
}

// Get all gear reviews
export async function getGearReviews(): Promise<GearReview[]> {
  try {
    const q = query(
      collection(db, GEAR_REVIEWS_COLLECTION),
      orderBy("createdAt", "desc"),
      limit(100)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as GearReview[];
  } catch (error) {
    console.error("Error fetching gear reviews:", error);
    return [];
  }
}

// Get gear reviews by category
export async function getGearReviewsByCategory(category: string): Promise<GearReview[]> {
  try {
    const q = query(
      collection(db, GEAR_REVIEWS_COLLECTION),
      where("category", "==", category),
      orderBy("createdAt", "desc"),
      limit(50)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as GearReview[];
  } catch (error) {
    console.error("Error fetching gear reviews by category:", error);
    return [];
  }
}

// Get single gear review
export async function getGearReviewById(reviewId: string): Promise<GearReview | null> {
  try {
    const docRef = doc(db, GEAR_REVIEWS_COLLECTION, reviewId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data(),
      } as GearReview;
    }
    return null;
  } catch (error) {
    console.error("Error fetching gear review:", error);
    return null;
  }
}

// Get reviews by user
export async function getReviewsByUser(userId: string): Promise<GearReview[]> {
  try {
    const q = query(
      collection(db, GEAR_REVIEWS_COLLECTION),
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as GearReview[];
  } catch (error) {
    console.error("Error fetching user reviews:", error);
    return [];
  }
}

// Delete gear review
export async function deleteGearReview(reviewId: string, userId: string): Promise<void> {
  try {
    const reviewRef = doc(db, GEAR_REVIEWS_COLLECTION, reviewId);
    const reviewDoc = await getDoc(reviewRef);

    if (!reviewDoc.exists()) {
      throw new Error("Review not found");
    }

    if (reviewDoc.data().userId !== userId) {
      throw new Error("Unauthorized to delete this review");
    }

    await deleteDoc(reviewRef);
  } catch (error) {
    console.error("Error deleting review:", error);
    throw error;
  }
}
