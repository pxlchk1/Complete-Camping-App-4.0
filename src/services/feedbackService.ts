/**
 * Feedback Firestore Service
 * Collections: feedbackPosts, feedbackComments
 */

import {
  getFirestore,
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
import firebaseApp from "../config/firebase";
import { FeedbackPost, FeedbackComment, FeedbackCategory, FeedbackStatus } from "../types/community";

const db = getFirestore(firebaseApp);

// ==================== Feedback Posts ====================

export async function getFeedbackPosts(
  sortBy: "newest" | "upvoted" = "newest",
  category?: FeedbackCategory,
  limitCount: number = 20,
  lastDoc?: DocumentSnapshot
): Promise<{ posts: FeedbackPost[]; lastDoc: DocumentSnapshot | null }> {
  const postsRef = collection(db, "feedbackPosts");

  try {
    let q = query(postsRef);

    // If category filter is applied, we need a composite index
    // For now, we'll fetch all and filter client-side to avoid index requirements
    if (sortBy === "newest") {
      q = query(q, orderBy("createdAt", "desc"), limit(limitCount * 2)); // Fetch extra for client-side filtering
    } else if (sortBy === "upvoted") {
      q = query(q, orderBy("voteCount", "desc"), limit(limitCount * 2));
    } else {
      q = query(q, limit(limitCount * 2));
    }

    if (lastDoc) {
      q = query(q, startAfter(lastDoc));
    }

    const snapshot = await getDocs(q);

    // Apply category filter client-side
    let filteredDocs = snapshot.docs;
    if (category) {
      filteredDocs = snapshot.docs.filter(doc => doc.data().category === category);
    }

    // Limit to requested count
    const limitedDocs = filteredDocs.slice(0, limitCount);

    const posts = limitedDocs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as FeedbackPost[];

    const lastVisible = limitedDocs[limitedDocs.length - 1] || null;

    return { posts, lastDoc: lastVisible };
  } catch (error: any) {
    // If there's a permissions or index error, return empty array
    console.error("Error fetching feedback posts:", error);

    // Throw a user-friendly error
    if (error.code === "permission-denied") {
      throw new Error("Unable to load feedback. Please check your connection.");
    }

    throw error;
  }
}

export async function getFeedbackPostById(postId: string): Promise<FeedbackPost | null> {
  try {
    const postRef = doc(db, "feedbackPosts", postId);
    const postSnap = await getDoc(postRef);

    if (!postSnap.exists()) {
      return null;
    }

    return {
      id: postSnap.id,
      ...postSnap.data()
    } as FeedbackPost;
  } catch (error: any) {
    console.error("Error fetching feedback post:", error);
    // Throw a user-friendly error message
    throw new Error("Unable to load feedback post. Please try again.");
  }
}

export async function createFeedbackPost(data: {
  title: string;
  body: string;
  category: FeedbackCategory;
  authorId: string;
}): Promise<string> {
  const postsRef = collection(db, "feedbackPosts");

  const docRef = await addDoc(postsRef, {
    title: data.title,
    body: data.body,
    category: data.category,
    authorId: data.authorId,
    createdAt: serverTimestamp(),
    status: "open" as FeedbackStatus,
    voteCount: 0,
    commentCount: 0,
  });

  return docRef.id;
}

export async function upvoteFeedbackPost(postId: string): Promise<void> {
  const postRef = doc(db, "feedbackPosts", postId);
  await updateDoc(postRef, {
    voteCount: increment(1),
  });
}

// ==================== Feedback Comments ====================

export async function getFeedbackComments(
  feedbackId: string,
  limitCount: number = 50
): Promise<FeedbackComment[]> {
  const commentsRef = collection(db, "feedbackComments");

  try {
    const q = query(
      commentsRef,
      where("feedbackId", "==", feedbackId),
      orderBy("createdAt", "asc"),
      limit(limitCount)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as FeedbackComment[];
  } catch (error: any) {
    console.error("Error fetching feedback comments:", error);

    // If index is missing, try a simpler query
    // Safely check error properties to avoid "Cannot read property of undefined" errors
    const errorCode = error?.code;
    const errorMessage = typeof error?.message === 'string' ? error.message : '';
    
    if (errorCode === "failed-precondition" || errorMessage.includes("index")) {
      const simpleQuery = query(commentsRef, where("feedbackId", "==", feedbackId));
      const snapshot = await getDocs(simpleQuery);

      // Sort client-side
      const comments = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as FeedbackComment[];

      return comments.sort((a, b) => {
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

export async function addFeedbackComment(data: {
  feedbackId: string;
  body: string;
  authorId: string;
}): Promise<string> {
  const commentsRef = collection(db, "feedbackComments");

  const docRef = await addDoc(commentsRef, {
    feedbackId: data.feedbackId,
    body: data.body,
    authorId: data.authorId,
    createdAt: serverTimestamp(),
  });

  // Increment comment count
  const postRef = doc(db, "feedbackPosts", data.feedbackId);
  await updateDoc(postRef, {
    commentCount: increment(1),
  });

  return docRef.id;
}
