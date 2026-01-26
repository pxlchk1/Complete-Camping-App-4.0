import { collection, doc, getDoc, setDoc, deleteDoc, onSnapshot, runTransaction, getDocs } from 'firebase/firestore';
import { db, auth } from '../../config/firebase';
import { checkAndApplyAutoHide, AUTO_HIDE_DOWNVOTE_THRESHOLD } from '../moderationService';

export interface FeedbackVote {
  userId: string;
  value: 1 | -1;
}

export const feedbackVoteService = {
  // Listen to vote state for a post for the current user
  onUserVote(postId: string, callback: (vote: FeedbackVote | null) => void) {
    const user = auth.currentUser;
    if (!user) return () => {};
    const voteRef = doc(db, 'feedbackPosts', postId, 'votes', user.uid);
    return onSnapshot(voteRef, (snap) => {
      if (snap.exists()) {
        callback({ userId: user.uid, value: snap.data().value });
      } else {
        callback(null);
      }
    });
  },

  // Get vote state for a post for the current user
  async getUserVote(postId: string): Promise<FeedbackVote | null> {
    const user = auth.currentUser;
    if (!user) return null;
    const voteRef = doc(db, 'feedbackPosts', postId, 'votes', user.uid);
    const snap = await getDoc(voteRef);
    if (snap.exists()) {
      return { userId: user.uid, value: snap.data().value };
    }
    return null;
  },

  // Set vote (upvote or downvote)
  async setVote(postId: string, value: 1 | -1): Promise<void> {
    const user = auth.currentUser;
    if (!user) throw new Error('Must be signed in to vote');
    const voteRef = doc(db, 'feedbackPosts', postId, 'votes', user.uid);
    await setDoc(voteRef, { value }, { merge: true });
  },

  // Remove vote
  async removeVote(postId: string): Promise<void> {
    const user = auth.currentUser;
    if (!user) throw new Error('Must be signed in to remove vote');
    const voteRef = doc(db, 'feedbackPosts', postId, 'votes', user.uid);
    await deleteDoc(voteRef);
  },

  // Transactional voting: ensures karmaScore is updated atomically
  // Also checks downvote threshold for auto-hide moderation.
  async vote(postId: string, value: 1 | -1): Promise<{ wasAutoHidden?: boolean }> {
    const user = auth.currentUser;
    if (!user) throw new Error('Must be signed in to vote');
    const postRef = doc(db, 'feedbackPosts', postId);
    const voteRef = doc(db, 'feedbackPosts', postId, 'votes', user.uid);
    
    let finalDownvotes = 0;
    
    await runTransaction(db, async (transaction) => {
      const postSnap = await transaction.get(postRef);
      if (!postSnap.exists()) throw new Error('Post not found');
      const voteSnap = await transaction.get(voteRef);
      const postData = postSnap.data()!;
      let karmaScore = postData.karmaScore || 0;
      let downvotes = postData.downvotes || 0;
      let prevValue = 0;
      if (voteSnap.exists()) {
        prevValue = voteSnap.data()?.value || 0;
      }
      // If same vote, remove
      if (prevValue === value) {
        transaction.delete(voteRef);
        karmaScore -= value;
        // Track downvotes for moderation
        if (value === -1) downvotes--;
      } else {
        transaction.set(voteRef, { value });
        karmaScore += value - prevValue;
        // Track downvotes for moderation
        if (value === -1) downvotes++;
        if (prevValue === -1) downvotes--;
      }
      transaction.update(postRef, { karmaScore, downvotes });
      finalDownvotes = downvotes;
    });
    
    // After transaction completes, check if we need to auto-hide
    let wasAutoHidden = false;
    if (finalDownvotes >= AUTO_HIDE_DOWNVOTE_THRESHOLD) {
      wasAutoHidden = await checkAndApplyAutoHide('feedbackPosts', postId, finalDownvotes);
    }
    
    return { wasAutoHidden };
  },
};
