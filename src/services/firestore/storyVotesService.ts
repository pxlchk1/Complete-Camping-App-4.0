/**
 * Story Votes Service
 * Reddit-style up/down voting for photo stories
 * Also integrates with moderation service to auto-hide content at downvote threshold.
 */

import {
  collection,
  doc,
  getDoc,
  deleteDoc,
  getDocs,
  runTransaction,
} from 'firebase/firestore';
import { db, auth } from '../../config/firebase';
import { checkAndApplyAutoHide, AUTO_HIDE_DOWNVOTE_THRESHOLD } from '../moderationService';

export interface StoryVote {
  oderId: string;
  voteType: 'up' | 'down';
}

export const storyVotesService = {
  // Get the current user's vote for a story
  async getUserVote(storyId: string): Promise<StoryVote | null> {
    const user = auth.currentUser;
    if (!user) return null;
    const voteDoc = doc(db, 'stories', storyId, 'votes', user.uid);
    const snap = await getDoc(voteDoc);
    if (!snap.exists()) return null;
    return snap.data() as StoryVote;
  },

  // Get the vote summary (score and counts) for a story
  async getVoteSummary(storyId: string): Promise<{ score: number; up: number; down: number }> {
    const votesCol = collection(db, 'stories', storyId, 'votes');
    const snap = await getDocs(votesCol);
    let up = 0, down = 0;
    snap.forEach(doc => {
      const v = doc.data() as StoryVote;
      if (v.voteType === 'up') up++;
      if (v.voteType === 'down') down++;
    });
    return { score: up - down, up, down };
  },

  // Transactional voting (handles toggling and score update)
  // Also checks downvote threshold for auto-hide moderation.
  async vote(storyId: string, voteType: 'up' | 'down'): Promise<{ wasAutoHidden?: boolean }> {
    const user = auth.currentUser;
    if (!user) throw new Error('Must be signed in to vote');
    const voteDocRef = doc(db, 'stories', storyId, 'votes', user.uid);
    const storyDocRef = doc(db, 'stories', storyId);
    
    let finalDownvotes = 0;
    
    await runTransaction(db, async (transaction) => {
      const voteSnap = await transaction.get(voteDocRef);
      const storySnap = await transaction.get(storyDocRef);
      
      if (!storySnap.exists()) throw new Error('Story not found');
      
      let upvotes = storySnap.data().upvotes || 0;
      let downvotes = storySnap.data().downvotes || 0;
      let prevVote: 'up' | 'down' | null = null;
      
      if (voteSnap.exists()) prevVote = voteSnap.data().voteType;
      
      // If same vote, remove it (toggle off)
      if (prevVote === voteType) {
        if (voteType === 'up') upvotes--;
        if (voteType === 'down') downvotes--;
        transaction.delete(voteDocRef);
      } else {
        // Remove previous vote
        if (prevVote === 'up') upvotes--;
        if (prevVote === 'down') downvotes--;
        // Add new vote
        if (voteType === 'up') upvotes++;
        if (voteType === 'down') downvotes++;
        // Write vote
        transaction.set(voteDocRef, { oderId: user.uid, voteType });
      }
      
      // Update story doc
      transaction.update(storyDocRef, { upvotes, downvotes });
      finalDownvotes = downvotes;
    });
    
    // After transaction completes, check if we need to auto-hide
    let wasAutoHidden = false;
    if (finalDownvotes >= AUTO_HIDE_DOWNVOTE_THRESHOLD) {
      wasAutoHidden = await checkAndApplyAutoHide('stories', storyId, finalDownvotes);
    }
    
    return { wasAutoHidden };
  },

  // Remove the user's vote for a story
  async removeUserVote(storyId: string): Promise<void> {
    const user = auth.currentUser;
    if (!user) throw new Error('Must be signed in to remove vote');
    const voteDoc = doc(db, 'stories', storyId, 'votes', user.uid);
    await deleteDoc(voteDoc);
  },
};
