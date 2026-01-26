import {
  collection,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  getDocs,
  runTransaction,
} from 'firebase/firestore';
import { db, auth } from '../../config/firebase';
import { checkAndApplyAutoHide, AUTO_HIDE_DOWNVOTE_THRESHOLD } from '../moderationService';

export interface GearReviewVote {
  userId: string;
  voteType: 'up' | 'down';
}

export const gearReviewVotesService = {
  async getUserVote(reviewId: string): Promise<GearReviewVote | null> {
    const user = auth.currentUser;
    if (!user) return null;
    const voteDoc = doc(db, 'gearReviews', reviewId, 'votes', user.uid);
    const snap = await getDoc(voteDoc);
    if (!snap.exists()) return null;
    return snap.data() as GearReviewVote;
  },

  async setUserVote(reviewId: string, voteType: 'up' | 'down'): Promise<void> {
    const user = auth.currentUser;
    if (!user) throw new Error('Must be signed in to vote');
    const voteDoc = doc(db, 'gearReviews', reviewId, 'votes', user.uid);
    await setDoc(voteDoc, { userId: user.uid, voteType });
  },

  async removeUserVote(reviewId: string): Promise<void> {
    const user = auth.currentUser;
    if (!user) throw new Error('Must be signed in to remove vote');
    const voteDoc = doc(db, 'gearReviews', reviewId, 'votes', user.uid);
    await deleteDoc(voteDoc);
  },

  async getVoteSummary(reviewId: string): Promise<{ score: number; up: number; down: number }> {
    const votesCol = collection(db, 'gearReviews', reviewId, 'votes');
    const snap = await getDocs(votesCol);
    let up = 0, down = 0;
    snap.forEach(doc => {
      const v = doc.data() as GearReviewVote;
      if (v.voteType === 'up') up++;
      if (v.voteType === 'down') down++;
    });
    return { score: up - down, up, down };
  },

  // Vote on a gear review with toggle behavior
  // Also checks downvote threshold for auto-hide moderation.
  async vote(reviewId: string, voteType: 'up' | 'down'): Promise<{ wasAutoHidden?: boolean }> {
    const user = auth.currentUser;
    if (!user) throw new Error('Must be signed in to vote');
    const voteDocRef = doc(db, 'gearReviews', reviewId, 'votes', user.uid);
    const reviewDocRef = doc(db, 'gearReviews', reviewId);
    
    let finalDownvotes = 0;
    
    await runTransaction(db, async (transaction) => {
      const voteSnap = await transaction.get(voteDocRef);
      const reviewSnap = await transaction.get(reviewDocRef);
      if (!reviewSnap.exists()) throw new Error('Review not found');
      let upvotes = reviewSnap.data().upvotes || 0;
      let downvotes = reviewSnap.data().downvotes || 0;
      let prevVote: 'up' | 'down' | null = null;
      if (voteSnap.exists()) prevVote = voteSnap.data().voteType;
      if (prevVote === 'up') upvotes--;
      if (prevVote === 'down') downvotes--;
      if (voteType === 'up') upvotes++;
      if (voteType === 'down') downvotes++;
      transaction.set(voteDocRef, { userId: user.uid, voteType });
      transaction.update(reviewDocRef, { upvotes, downvotes });
      finalDownvotes = downvotes;
    });
    
    // After transaction completes, check if we need to auto-hide
    let wasAutoHidden = false;
    if (finalDownvotes >= AUTO_HIDE_DOWNVOTE_THRESHOLD) {
      wasAutoHidden = await checkAndApplyAutoHide('gearReviews', reviewId, finalDownvotes);
    }
    
    return { wasAutoHidden };
  },
};
