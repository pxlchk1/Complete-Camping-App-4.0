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

const FEEDBACK_POSTS_COLLECTION = "feedbackPosts";
const FEEDBACK_COMMENTS_COLLECTION = "feedbackComments";

// Feedback interface matching EXACT Firestore structure
export interface FeedbackPost {
  id: string;
  topic: string;
  message: string;
  userId: string;
  createdAt: Timestamp | any;
  score?: number; // upvotes - downvotes, if voting enabled
}

export interface FeedbackComment {
  id: string;
  feedbackId: string;
  text: string;
  userId: string;
  createdAt: Timestamp | any;
}

// Get all feedback posts
export async function getFeedbackPosts(): Promise<FeedbackPost[]> {
  try {
    const q = query(
      collection(db, FEEDBACK_POSTS_COLLECTION),
      orderBy("createdAt", "desc"),
      limit(100)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as FeedbackPost[];
  } catch (error) {
    console.error("Error fetching feedback posts:", error);
    return [];
  }
}

// Get a single feedback post by ID
export async function getFeedbackPostById(postId: string): Promise<FeedbackPost | null> {
  try {
    const docRef = doc(db, FEEDBACK_POSTS_COLLECTION, postId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data(),
      } as FeedbackPost;
    }
    return null;
  } catch (error) {
    console.error("Error fetching feedback post:", error);
    return null;
  }
}

// Get comments for a feedback post
export async function getFeedbackComments(feedbackId: string): Promise<FeedbackComment[]> {
  try {
    const q = query(
      collection(db, FEEDBACK_COMMENTS_COLLECTION),
      where("feedbackId", "==", feedbackId),
      orderBy("createdAt", "asc")
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as FeedbackComment[];
  } catch (error) {
    console.error("Error fetching feedback comments:", error);
    return [];
  }
}

// Create a new feedback post
export async function createFeedbackPost(
  topic: string,
  message: string,
  userId: string
): Promise<string> {
  try {
    const feedbackDoc = {
      topic,
      message,
      userId,
      createdAt: Timestamp.now(),
    };

    const docRef = await addDoc(collection(db, FEEDBACK_POSTS_COLLECTION), feedbackDoc);
    return docRef.id;
  } catch (error) {
    console.error("Error creating feedback post:", error);
    throw error;
  }
}

// Add comment to feedback post
export async function addFeedbackComment(
  feedbackId: string,
  text: string,
  userId: string
): Promise<string> {
  try {
    const commentDoc = {
      feedbackId,
      text,
      userId,
      createdAt: Timestamp.now(),
    };

    const docRef = await addDoc(collection(db, FEEDBACK_COMMENTS_COLLECTION), commentDoc);
    return docRef.id;
  } catch (error) {
    console.error("Error adding feedback comment:", error);
    throw error;
  }
}

// Delete a feedback post
export async function deleteFeedbackPost(postId: string, userId: string): Promise<void> {
  try {
    const postRef = doc(db, FEEDBACK_POSTS_COLLECTION, postId);
    const postDoc = await getDoc(postRef);

    if (!postDoc.exists()) {
      throw new Error("Post not found");
    }

    if (postDoc.data().userId !== userId) {
      throw new Error("Unauthorized to delete this post");
    }

    await deleteDoc(postRef);
  } catch (error) {
    console.error("Error deleting feedback post:", error);
    throw error;
  }
}
