import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  getDocs,
  updateDoc,
  doc,
  getDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db, auth } from '../../config/firebase';

export interface FeedbackComment {
  id: string;
  feedbackID: string;
  handle: string;
  text: string;
  karmaScore: number;
  createdAt: Timestamp;
}

export const feedbackCommentsService = {
  // Get comments for a specific feedback post
  async getCommentsByFeedbackId(feedbackID: string): Promise<FeedbackComment[]> {
    const q = query(
      collection(db, 'feedbackComments'),
      where('feedbackID', '==', feedbackID),
      orderBy('createdAt', 'asc')
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as FeedbackComment[];
  },

  // Create a new comment
  async createComment(data: {
    feedbackID: string;
    text: string;
  }): Promise<string> {
    const user = auth.currentUser;
    if (!user) throw new Error('Must be signed in to comment');

    const commentData = {
      feedbackID: data.feedbackID,
      handle: user.displayName || '@anonymous',
      text: data.text,
      karmaScore: 0,
      createdAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, 'feedbackComments'), commentData);
    return docRef.id;
  },

  // Adjust karma score (upvote/downvote)
  async adjustKarma(commentId: string, delta: 1 | -1): Promise<void> {
    const user = auth.currentUser;
    if (!user) throw new Error('Must be signed in to vote');

    const docRef = doc(db, 'feedbackComments', commentId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) throw new Error('Comment not found');

    const currentKarma = docSnap.data().karmaScore || 0;
    await updateDoc(docRef, {
      karmaScore: currentKarma + delta,
    });
  },
};
