/**
 * Gear Reviews Firestore Service
 * Collection: gearReviews
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  increment,
  DocumentSnapshot,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { GearReview, GearCategory } from "../types/community";

export async function getGearReviews(
  category?: GearCategory | "all",
  limitCount: number = 20,
  lastDoc?: DocumentSnapshot
): Promise<{ reviews: GearReview[]; lastDoc: DocumentSnapshot | null }> {
  const reviewsRef = collection(db, "gearReviews");

  let q = query(reviewsRef, orderBy("createdAt", "desc"));

  if (category && category !== "all") {
    q = query(reviewsRef, where("category", "==", category), orderBy("createdAt", "desc"));
  }

  q = query(q, limit(limitCount));

  if (lastDoc) {
    q = query(q, startAfter(lastDoc));
  }

  const snapshot = await getDocs(q);
  const reviews = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as GearReview[];

  const lastVisible = snapshot.docs[snapshot.docs.length - 1] || null;

  return { reviews, lastDoc: lastVisible };
}

export async function getGearReviewById(reviewId: string): Promise<GearReview | null> {
  const reviewRef = doc(db, "gearReviews", reviewId);
  const reviewSnap = await getDoc(reviewRef);

  if (!reviewSnap.exists()) {
    return null;
  }

  return {
    id: reviewSnap.id,
    ...reviewSnap.data()
  } as GearReview;
}

export async function createGearReview(data: {
  gearName: string;
  brand?: string;
  category: GearCategory;
  rating: number;
  summary: string;
  body: string;
  pros?: string;
  cons?: string;
  tags: string[];
  photoUrls?: string[];
  productUrl?: string;
  authorId: string;
  authorHandle: string;
}): Promise<string> {
  const reviewsRef = collection(db, "gearReviews");

  const docRef = await addDoc(reviewsRef, {
    gearName: data.gearName,
    brand: data.brand || null,
    category: data.category,
    rating: data.rating,
    summary: data.summary,
    body: data.body,
    pros: data.pros || null,
    cons: data.cons || null,
    tags: data.tags,
    photoUrls: data.photoUrls || [],
    productUrl: data.productUrl || null,
    authorId: data.authorId,
    authorHandle: data.authorHandle,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    upvoteCount: 0,
    downvoteCount: 0,
    score: 0,
    commentCount: 0,
  });

  return docRef.id;
}

export async function updateGearReview(
  reviewId: string,
  data: {
    gearName?: string;
    brand?: string | null;
    category?: GearCategory;
    rating?: number;
    summary?: string;
    body?: string;
    pros?: string;
    cons?: string;
    tags?: string[];
    photoUrls?: string[];
    productUrl?: string | null;
  }
): Promise<void> {
  const reviewRef = doc(db, "gearReviews", reviewId);
  
  // Filter out undefined values - Firestore doesn't handle them well
  const cleanData: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      cleanData[key] = value;
    }
  }
  
  await updateDoc(reviewRef, {
    ...cleanData,
    updatedAt: serverTimestamp(),
  });
}

export async function upvoteGearReview(reviewId: string): Promise<void> {
  const reviewRef = doc(db, "gearReviews", reviewId);
  await updateDoc(reviewRef, {
    upvoteCount: increment(1),
  });
}
