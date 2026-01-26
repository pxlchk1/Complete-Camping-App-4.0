import {
  collection,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  increment,
  updateDoc,
  runTransaction,
} from 'firebase/firestore';
import { db, auth } from '../../config/firebase';
import { checkAndApplyAutoHide, AUTO_HIDE_DOWNVOTE_THRESHOLD } from '../moderationService';

export interface TipVote {
  userId: string;
  voteType: 'up' | 'down';
}

export const tipVotesService = {
  // Get the current user's vote for a tip
  async getUserVote(tipId: string): Promise<TipVote | null> {
    const user = auth.currentUser;
    if (!user) return null;
    const voteDoc = doc(db, 'tips', tipId, 'votes', user.uid);
    const snap = await getDoc(voteDoc);
    if (!snap.exists()) return null;
    return snap.data() as TipVote;
  },

  // Set or update the user's vote for a tip
  async setUserVote(tipId: string, voteType: 'up' | 'down'): Promise<void> {
    const user = auth.currentUser;
    if (!user) throw new Error('Must be signed in to vote');
    const voteDoc = doc(db, 'tips', tipId, 'votes', user.uid);
    await setDoc(voteDoc, { userId: user.uid, voteType });
  },

  // Remove the user's vote for a tip
  async removeUserVote(tipId: string): Promise<void> {
    const user = auth.currentUser;
    if (!user) throw new Error('Must be signed in to remove vote');
    const voteDoc = doc(db, 'tips', tipId, 'votes', user.uid);
    await deleteDoc(voteDoc);
  },

  // Get the vote summary (score and counts) for a tip
  async getVoteSummary(tipId: string): Promise<{ score: number; up: number; down: number }> {
    const votesCol = collection(db, 'tips', tipId, 'votes');
    const snap = await getDocs(votesCol);
    let up = 0, down = 0;
    snap.forEach(doc => {
      const v = doc.data() as TipVote;
      if (v.voteType === 'up') up++;
      if (v.voteType === 'down') down++;
    });
    return { score: up - down, up, down };
  },

  // Transactional voting (handles toggling and score update)
  // Also checks downvote threshold for auto-hide moderation.
  async vote(tipId: string, voteType: 'up' | 'down'): Promise<{ wasAutoHidden?: boolean }> {
    const user = auth.currentUser;
    if (!user) throw new Error('Must be signed in to vote');
    const voteDocRef = doc(db, 'tips', tipId, 'votes', user.uid);
    const tipDocRef = doc(db, 'tips', tipId);
    
    let finalDownvotes = 0;
    
    await runTransaction(db, async (transaction) => {
      const voteSnap = await transaction.get(voteDocRef);
      const tipSnap = await transaction.get(tipDocRef);
      if (!tipSnap.exists()) throw new Error('Tip not found');
      let upvotes = tipSnap.data().upvotes || 0;
      let downvotes = tipSnap.data().downvotes || 0;
      let prevVote: 'up' | 'down' | null = null;
      if (voteSnap.exists()) prevVote = voteSnap.data().voteType;
      // Remove previous vote
      if (prevVote === 'up') upvotes--;
      if (prevVote === 'down') downvotes--;
      // Add new vote
      if (voteType === 'up') upvotes++;
      if (voteType === 'down') downvotes++;
      // Write vote
      transaction.set(voteDocRef, { userId: user.uid, voteType });
      // Update tip doc
      transaction.update(tipDocRef, { upvotes, downvotes });
      
      finalDownvotes = downvotes;
    });
    
    // After transaction completes, check if we need to auto-hide
    let wasAutoHidden = false;
    if (finalDownvotes >= AUTO_HIDE_DOWNVOTE_THRESHOLD) {
      wasAutoHidden = await checkAndApplyAutoHide('tips', tipId, finalDownvotes);
    }
    
    return { wasAutoHidden };
  },
};
