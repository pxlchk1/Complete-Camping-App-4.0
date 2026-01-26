/**
 * Moderation Service
 * 
 * Handles auto-hide moderation based on community downvotes.
 * 
 * Rule: Any content reaching 3+ downvotes becomes hidden and enters moderator review.
 * 
 * Hidden content:
 * - Not shown in public feeds
 * - Author can still see their own content with "Hidden pending review" badge
 * - Appears in moderator/admin review queues
 * 
 * Once hidden, content stays hidden until moderator action (no auto-unhide).
 */

import { doc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

// Threshold for auto-hiding content
export const AUTO_HIDE_DOWNVOTE_THRESHOLD = 3;

// Hidden reason constants
export const HIDDEN_REASONS = {
  AUTO_DOWNVOTE_THRESHOLD: 'AUTO_DOWNVOTE_THRESHOLD',
  MANUAL_MODERATOR: 'MANUAL_MODERATOR',
  REPORTED: 'REPORTED',
} as const;

// Review queue status
export type ReviewQueueStatus = 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';

export interface ModerationFields {
  isHidden?: boolean;
  hiddenReason?: string;
  hiddenAt?: any; // Firestore timestamp
  needsReview?: boolean;
  reviewQueueStatus?: ReviewQueueStatus;
  reviewedBy?: string;
  reviewedAt?: any;
  reviewNotes?: string;
}

/**
 * Check if content should be hidden based on downvote count
 * and apply hiding if threshold is reached.
 * 
 * Call this AFTER a vote transaction updates the counts.
 * 
 * @param collectionPath - The Firestore collection path (e.g., 'feedback', 'tips')
 * @param itemId - The document ID
 * @param currentDownvotes - The current downvote count after the vote
 * @returns true if the item was hidden, false otherwise
 */
export async function checkAndApplyAutoHide(
  collectionPath: string,
  itemId: string,
  currentDownvotes: number
): Promise<boolean> {
  // Only trigger if we've hit the threshold
  if (currentDownvotes < AUTO_HIDE_DOWNVOTE_THRESHOLD) {
    return false;
  }

  const itemRef = doc(db, collectionPath, itemId);

  try {
    // Check if already hidden (don't re-hide)
    const itemSnap = await getDoc(itemRef);
    if (!itemSnap.exists()) {
      return false;
    }

    const data = itemSnap.data();
    if (data.isHidden === true) {
      // Already hidden, no action needed
      return false;
    }

    // Apply auto-hide
    await updateDoc(itemRef, {
      isHidden: true,
      needsReview: true,
      hiddenReason: HIDDEN_REASONS.AUTO_DOWNVOTE_THRESHOLD,
      hiddenAt: serverTimestamp(),
      reviewQueueStatus: 'PENDING',
    });

    console.log(`[Moderation] Auto-hidden ${collectionPath}/${itemId} - reached ${currentDownvotes} downvotes`);
    return true;
  } catch (error) {
    console.error(`[Moderation] Failed to auto-hide ${collectionPath}/${itemId}:`, error);
    return false;
  }
}

/**
 * Moderator action: Approve content (unhide and mark as reviewed)
 */
export async function moderatorApprove(
  collectionPath: string,
  itemId: string,
  moderatorId: string,
  notes?: string
): Promise<void> {
  const itemRef = doc(db, collectionPath, itemId);

  await updateDoc(itemRef, {
    isHidden: false,
    needsReview: false,
    reviewQueueStatus: 'APPROVED',
    reviewedBy: moderatorId,
    reviewedAt: serverTimestamp(),
    reviewNotes: notes || null,
  });

  console.log(`[Moderation] Approved ${collectionPath}/${itemId} by ${moderatorId}`);
}

/**
 * Moderator action: Reject content (keep hidden, mark as rejected)
 */
export async function moderatorReject(
  collectionPath: string,
  itemId: string,
  moderatorId: string,
  notes?: string
): Promise<void> {
  const itemRef = doc(db, collectionPath, itemId);

  await updateDoc(itemRef, {
    isHidden: true,
    needsReview: false,
    reviewQueueStatus: 'REJECTED',
    reviewedBy: moderatorId,
    reviewedAt: serverTimestamp(),
    reviewNotes: notes || null,
  });

  console.log(`[Moderation] Rejected ${collectionPath}/${itemId} by ${moderatorId}`);
}

/**
 * Check if content is hidden
 */
export async function isContentHidden(
  collectionPath: string,
  itemId: string
): Promise<boolean> {
  const itemRef = doc(db, collectionPath, itemId);
  const snap = await getDoc(itemRef);
  
  if (!snap.exists()) return false;
  return snap.data().isHidden === true;
}

/**
 * Check if current user is the author of content
 * (for showing hidden content to its author)
 */
export function isAuthor(itemAuthorId: string, currentUserId: string | undefined): boolean {
  if (!currentUserId) return false;
  return itemAuthorId === currentUserId;
}

/**
 * Filter function for feeds - excludes hidden content unless user is author
 */
export function shouldShowInFeed<T extends { isHidden?: boolean; authorId?: string }>(
  item: T,
  currentUserId?: string
): boolean {
  // Not hidden - always show
  if (!item.isHidden) return true;
  
  // Hidden but user is author - show with badge
  if (currentUserId && item.authorId === currentUserId) return true;
  
  // Hidden and not author - don't show
  return false;
}
