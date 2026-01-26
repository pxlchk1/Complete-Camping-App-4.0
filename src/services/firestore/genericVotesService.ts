/**
 * Generic Votes Service
 * Handles up/down voting for any collection (tips, gearReviews, feedback, stories, questions, etc.)
 * 
 * Also integrates with moderation service to auto-hide content at downvote threshold.
 * 
 * Supports both naming conventions:
 * - upvotes/downvotes (standard)
 * - upvoteCount/downvoteCount (some collections use this)
 */

import {
  doc,
  getDoc,
  runTransaction,
} from 'firebase/firestore';
import { db, auth } from '../../config/firebase';
import { checkAndApplyAutoHide, AUTO_HIDE_DOWNVOTE_THRESHOLD } from '../moderationService';

export interface GenericVote {
  userId: string;
  voteType: 'up' | 'down';
  createdAt: string;
}

export const genericVotesService = {
  /**
   * Get the current user's vote for an item
   * Handles both voteType ('up'/'down') and value (1/-1) formats
   */
  async getUserVote(collectionPath: string, itemId: string): Promise<GenericVote | null> {
    const user = auth.currentUser;
    if (!user) return null;
    const voteDoc = doc(db, collectionPath, itemId, 'votes', user.uid);
    const snap = await getDoc(voteDoc);
    if (!snap.exists()) return null;
    const data = snap.data();
    // Handle both formats: voteType ('up'/'down') or value (1/-1)
    let voteType: 'up' | 'down' = data.voteType;
    if (!voteType && typeof data.value === 'number') {
      voteType = data.value === 1 ? 'up' : 'down';
    }
    return { ...data, voteType } as GenericVote;
  },

  /**
   * Vote on an item with toggle behavior:
   * - If no vote exists, add the vote
   * - If same vote type, remove the vote (toggle off)
   * - If different vote type, switch to new vote
   * 
   * Also checks downvote threshold for auto-hide moderation.
   */
  async vote(collectionPath: string, itemId: string, voteType: 'up' | 'down'): Promise<{ 
    newScore: number; 
    newUserVote: 'up' | 'down' | null;
    wasAutoHidden?: boolean;
  }> {
    const user = auth.currentUser;
    if (!user) throw new Error('Must be signed in to vote');
    
    const voteDocRef = doc(db, collectionPath, itemId, 'votes', user.uid);
    const itemDocRef = doc(db, collectionPath, itemId);
    
    let finalScore = 0;
    let finalUserVote: 'up' | 'down' | null = null;
    let finalDownvotes = 0;
    
    await runTransaction(db, async (transaction) => {
      const voteSnap = await transaction.get(voteDocRef);
      const itemSnap = await transaction.get(itemDocRef);
      
      if (!itemSnap.exists()) throw new Error('Item not found');
      
      const itemData = itemSnap.data();
      // Support both naming conventions: upvotes/downvotes OR upvoteCount/downvoteCount
      let upvotes = itemData.upvotes ?? itemData.upvoteCount ?? 0;
      let downvotes = itemData.downvotes ?? itemData.downvoteCount ?? 0;
      
      // Determine which field names this collection uses
      const usesCountSuffix = itemData.upvoteCount !== undefined || itemData.downvoteCount !== undefined;
      
      let prevVote: 'up' | 'down' | null = null;
      
      if (voteSnap.exists()) {
        const voteData = voteSnap.data();
        // Handle both formats: voteType ('up'/'down') or value (1/-1)
        prevVote = voteData.voteType || (voteData.value === 1 ? 'up' : voteData.value === -1 ? 'down' : null);
      }
      
      // Toggle behavior: same vote = remove, different vote = switch
      if (prevVote === voteType) {
        // Toggle off - remove vote
        if (voteType === 'up') upvotes--;
        if (voteType === 'down') downvotes--;
        transaction.delete(voteDocRef);
        finalUserVote = null;
      } else {
        // Remove previous vote effect
        if (prevVote === 'up') upvotes--;
        if (prevVote === 'down') downvotes--;
        
        // Add new vote effect
        if (voteType === 'up') upvotes++;
        if (voteType === 'down') downvotes++;
        
        // Write the vote
        transaction.set(voteDocRef, { 
          userId: user.uid, 
          voteType,
          createdAt: new Date().toISOString(),
        });
        finalUserVote = voteType;
      }
      
      // Update the item's vote counts using the appropriate field names
      if (usesCountSuffix) {
        transaction.update(itemDocRef, { upvoteCount: upvotes, downvoteCount: downvotes });
      } else {
        transaction.update(itemDocRef, { upvotes, downvotes });
      }
      finalScore = upvotes - downvotes;
      finalDownvotes = downvotes;
    });
    
    // After transaction completes, check if we need to auto-hide
    let wasAutoHidden = false;
    if (finalDownvotes >= AUTO_HIDE_DOWNVOTE_THRESHOLD) {
      wasAutoHidden = await checkAndApplyAutoHide(collectionPath, itemId, finalDownvotes);
    }
    
    return { newScore: finalScore, newUserVote: finalUserVote, wasAutoHidden };
  },
};
