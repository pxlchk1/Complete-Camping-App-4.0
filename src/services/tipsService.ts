/**
 * Tips Firestore Service
 * Collection: tips, tipComments
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
  Timestamp,
  DocumentSnapshot,
} from "firebase/firestore";
import firebaseApp from "../config/firebase";
import { Tip, TipComment } from "../types/community";

const db = getFirestore(firebaseApp);

// ==================== Tips ====================

export async function getTips(
  sortBy: "newest" | "helpful" = "newest",
  limitCount: number = 20,
  lastDoc?: DocumentSnapshot
): Promise<{ tips: Tip[]; lastDoc: DocumentSnapshot | null }> {
  const tipsRef = collection(db, "tips");

  let q = query(tipsRef);

  if (sortBy === "newest") {
    q = query(q, orderBy("createdAt", "desc"));
  } else if (sortBy === "helpful") {
    q = query(q, orderBy("upvoteCount", "desc"), orderBy("createdAt", "desc"));
  }

  q = query(q, limit(limitCount));

  if (lastDoc) {
    q = query(q, startAfter(lastDoc));
  }

  const snapshot = await getDocs(q);
  const tips = snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      body: data.text || data.body || data.content || '',
    };
  }) as Tip[];

  const lastVisible = snapshot.docs[snapshot.docs.length - 1] || null;

  return { tips, lastDoc: lastVisible };
}

export async function getMyTips(
  userId: string,
  limitCount: number = 20,
  lastDoc?: DocumentSnapshot
): Promise<{ tips: Tip[]; lastDoc: DocumentSnapshot | null }> {
  const tipsRef = collection(db, "tips");

  let q = query(
    tipsRef,
    where("authorId", "==", userId),
    orderBy("createdAt", "desc"),
    limit(limitCount)
  );

  if (lastDoc) {
    q = query(q, startAfter(lastDoc));
  }

  const snapshot = await getDocs(q);
  const tips = snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      body: data.text || data.body || data.content || '',
    };
  }) as Tip[];

  const lastVisible = snapshot.docs[snapshot.docs.length - 1] || null;

  return { tips, lastDoc: lastVisible };
}

export async function getTipById(tipId: string): Promise<Tip | null> {
  const tipRef = doc(db, "tips", tipId);
  const tipSnap = await getDoc(tipRef);

  if (!tipSnap.exists()) {
    return null;
  }

  const data = tipSnap.data();
  return {
    id: tipSnap.id,
    ...data,
    body: data.text || data.body || data.content || '',
  } as Tip;
}

export async function createTip(data: {
  title: string;
  body: string;
  tags: string[];
  authorId: string;
}): Promise<string> {
  const tipsRef = collection(db, "tips");

  const docRef = await addDoc(tipsRef, {
    title: data.title,
    body: data.body,
    tags: data.tags,
    authorId: data.authorId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    upvoteCount: 0,
    commentCount: 0,
  });

  return docRef.id;
}

export async function upvoteTip(tipId: string): Promise<void> {
  const tipRef = doc(db, "tips", tipId);
  await updateDoc(tipRef, {
    upvoteCount: increment(1),
  });
}

// ==================== Tip Comments ====================

export async function getTipComments(
  tipId: string,
  limitCount: number = 50
): Promise<TipComment[]> {
  const commentsRef = collection(db, "tipComments");
  const q = query(
    commentsRef,
    where("tipId", "==", tipId),
    orderBy("createdAt", "asc"),
    limit(limitCount)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      body: data.text || data.body || '',
    };
  }) as TipComment[];
}

export async function addTipComment(data: {
  tipId: string;
  body: string;
  authorId: string;
  username?: string;
}): Promise<string> {
  const commentsRef = collection(db, "tipComments");

  const docRef = await addDoc(commentsRef, {
    tipId: data.tipId,
    text: data.body,
    userId: data.authorId,
    username: data.username || 'Anonymous',
    createdAt: serverTimestamp(),
    helpful_count: 0,
  });

  // Increment comment count on tip
  const tipRef = doc(db, "tips", data.tipId);
  await updateDoc(tipRef, {
    commentCount: increment(1),
  });

  return docRef.id;
}

export async function upvoteTipComment(commentId: string): Promise<void> {
  const commentRef = doc(db, "tipComments", commentId);
  await updateDoc(commentRef, {
    upvoteCount: increment(1),
  });
}
