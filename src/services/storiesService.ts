/**
 * Stories (Photo Library) Firestore Service
 * Collections: stories, storyComments, storyVotes
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
  limit,
  startAfter,
  serverTimestamp,
  increment,
  DocumentSnapshot,
} from "firebase/firestore";
import firebaseApp from "../config/firebase";
import { Story, StoryComment, StoryVote } from "../types/community";

const db = getFirestore(firebaseApp);

// ==================== Stories ====================

export async function getStories(
  filterTag?: string,
  userId?: string,
  limitCount: number = 30,
  lastDoc?: DocumentSnapshot
): Promise<{ stories: Story[]; lastDoc: DocumentSnapshot | null }> {
  const storiesRef = collection(db, "stories");

  let q = query(storiesRef, orderBy("createdAt", "desc"));

  if (filterTag) {
    q = query(storiesRef, where("tags", "array-contains", filterTag), orderBy("createdAt", "desc"));
  } else if (userId) {
    q = query(storiesRef, where("authorId", "==", userId), orderBy("createdAt", "desc"));
  }

  q = query(q, limit(limitCount));

  if (lastDoc) {
    q = query(q, startAfter(lastDoc));
  }

  const snapshot = await getDocs(q);
  const stories = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Story[];

  const lastVisible = snapshot.docs[snapshot.docs.length - 1] || null;

  return { stories, lastDoc: lastVisible };
}

export async function getStoryById(storyId: string): Promise<Story | null> {
  const storyRef = doc(db, "stories", storyId);
  const storySnap = await getDoc(storyRef);

  if (!storySnap.exists()) {
    return null;
  }

  return {
    id: storySnap.id,
    ...storySnap.data()
  } as Story;
}

export async function createStory(data: {
  imageUrl: string;
  thumbnailUrl?: string;
  caption: string;
  tags: string[];
  authorId: string;
  locationLabel?: string;
}): Promise<string> {
  const storiesRef = collection(db, "stories");

  const docRef = await addDoc(storiesRef, {
    imageUrl: data.imageUrl,
    thumbnailUrl: data.thumbnailUrl || null,
    caption: data.caption,
    tags: data.tags,
    authorId: data.authorId,
    locationLabel: data.locationLabel || null,
    createdAt: serverTimestamp(),
    likeCount: 0,
    commentCount: 0,
  });

  return docRef.id;
}

// ==================== Story Votes (Likes) ====================

export async function likeStory(storyId: string, voterId: string): Promise<void> {
  const votesRef = collection(db, "storyVotes");

  // Check if already liked
  const q = query(
    votesRef,
    where("storyId", "==", storyId),
    where("voterId", "==", voterId)
  );
  const existingVotes = await getDocs(q);

  if (!existingVotes.empty) {
    // Already liked, unlike it
    await deleteDoc(existingVotes.docs[0].ref);

    const storyRef = doc(db, "stories", storyId);
    await updateDoc(storyRef, {
      likeCount: increment(-1),
    });
  } else {
    // Add like
    await addDoc(votesRef, {
      storyId,
      voterId,
      value: 1,
      createdAt: serverTimestamp(),
    });

    const storyRef = doc(db, "stories", storyId);
    await updateDoc(storyRef, {
      likeCount: increment(1),
    });
  }
}

export async function checkIfLiked(
  storyId: string,
  voterId: string
): Promise<boolean> {
  const votesRef = collection(db, "storyVotes");
  const q = query(
    votesRef,
    where("storyId", "==", storyId),
    where("voterId", "==", voterId)
  );

  const snapshot = await getDocs(q);
  return !snapshot.empty;
}

// ==================== Story Comments ====================

export async function getStoryComments(
  storyId: string,
  limitCount: number = 50
): Promise<StoryComment[]> {
  const commentsRef = collection(db, "storyComments");
  const q = query(
    commentsRef,
    where("storyId", "==", storyId),
    orderBy("createdAt", "asc"),
    limit(limitCount)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as StoryComment[];
}

export async function addStoryComment(data: {
  storyId: string;
  body: string;
  authorId: string;
}): Promise<string> {
  const commentsRef = collection(db, "storyComments");

  const docRef = await addDoc(commentsRef, {
    storyId: data.storyId,
    body: data.body,
    authorId: data.authorId,
    createdAt: serverTimestamp(),
  });

  // Increment comment count
  const storyRef = doc(db, "stories", data.storyId);
  await updateDoc(storyRef, {
    commentCount: increment(1),
  });

  return docRef.id;
}
