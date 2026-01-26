/**
 * Content Actions Service
 * 
 * Generic service for handling edit, delete, and moderation actions across all UGC types.
 * Implements soft delete for moderation with proper audit trails.
 */

import { 
  doc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp,
  Timestamp,
  getDoc,
} from "firebase/firestore";
import { db, auth } from "../config/firebase";
import { ContentItemType } from "../components/contentActions";

// Firestore collection mapping
const COLLECTION_MAP: Record<ContentItemType, string> = {
  tip: "tips",
  question: "questions",
  feedback: "feedbackPosts",
  review: "gearReviews",
  photo: "photoPosts", // Also check stories for legacy
  comment: "comments", // Generic, may need parent context
  answer: "answers",
  tripPost: "tripPosts",
  other: "content",
};

// Sub-collection paths for comments/answers that live under parent docs
const SUBCOLLECTION_MAP: Partial<Record<ContentItemType, { parent: string; child: string }>> = {
  // tipComments live under tips/{tipId}/comments
  // feedbackComments live under feedbackPosts/{postId}/comments
  // answers live under questions/{questionId}/answers
};

export type DeletedByRole = "owner" | "admin" | "moderator";

export interface SoftDeleteFields {
  isDeleted: boolean;
  deletedAt: Timestamp | null;
  deletedByUserId: string | null;
  deletedByRole: DeletedByRole | null;
}

export interface ContentActionResult {
  success: boolean;
  error?: string;
}

/**
 * Get the Firestore collection name for a content type
 */
export function getCollectionName(itemType: ContentItemType): string {
  return COLLECTION_MAP[itemType] || "content";
}

/**
 * Soft delete content (sets isDeleted flag, preserves data)
 * Recommended for moderation to allow potential undo/audit
 */
export async function softDeleteContent(
  itemType: ContentItemType,
  itemId: string,
  deletedByRole: DeletedByRole
): Promise<ContentActionResult> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    const collectionName = getCollectionName(itemType);
    const docRef = doc(db, collectionName, itemId);

    // Verify document exists
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      return { success: false, error: "Content not found" };
    }

    // Update with soft delete fields
    await updateDoc(docRef, {
      isDeleted: true,
      deletedAt: serverTimestamp(),
      deletedByUserId: currentUser.uid,
      deletedByRole,
      // Also set standard hidden fields for backward compatibility
      isHidden: true,
      hiddenAt: serverTimestamp(),
      hiddenBy: currentUser.uid,
      hiddenReason: deletedByRole === "owner" ? "OWNER_DELETE" : "MODERATOR_REMOVE",
    });

    console.log(`[ContentActions] Soft deleted ${itemType}:${itemId} by ${deletedByRole}`);
    return { success: true };
  } catch (error: any) {
    console.error(`[ContentActions] Soft delete failed for ${itemType}:${itemId}`, error);
    return { success: false, error: error.message || "Failed to delete" };
  }
}

/**
 * Hard delete content (permanently removes from Firestore)
 * Use sparingly - prefer soft delete for audit trails
 */
export async function hardDeleteContent(
  itemType: ContentItemType,
  itemId: string
): Promise<ContentActionResult> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    const collectionName = getCollectionName(itemType);
    const docRef = doc(db, collectionName, itemId);

    // Verify document exists
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      return { success: false, error: "Content not found" };
    }

    await deleteDoc(docRef);

    console.log(`[ContentActions] Hard deleted ${itemType}:${itemId}`);
    return { success: true };
  } catch (error: any) {
    console.error(`[ContentActions] Hard delete failed for ${itemType}:${itemId}`, error);
    return { success: false, error: error.message || "Failed to delete" };
  }
}

/**
 * Owner delete - soft delete with owner role
 */
export async function ownerDeleteContent(
  itemType: ContentItemType,
  itemId: string
): Promise<ContentActionResult> {
  return softDeleteContent(itemType, itemId, "owner");
}

/**
 * Admin remove - soft delete with admin role
 */
export async function adminRemoveContent(
  itemType: ContentItemType,
  itemId: string
): Promise<ContentActionResult> {
  return softDeleteContent(itemType, itemId, "admin");
}

/**
 * Moderator remove - soft delete with moderator role
 */
export async function moderatorRemoveContent(
  itemType: ContentItemType,
  itemId: string
): Promise<ContentActionResult> {
  return softDeleteContent(itemType, itemId, "moderator");
}

/**
 * Restore soft-deleted content (undo)
 */
export async function restoreContent(
  itemType: ContentItemType,
  itemId: string
): Promise<ContentActionResult> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    const collectionName = getCollectionName(itemType);
    const docRef = doc(db, collectionName, itemId);

    await updateDoc(docRef, {
      isDeleted: false,
      deletedAt: null,
      deletedByUserId: null,
      deletedByRole: null,
      isHidden: false,
      hiddenAt: null,
      hiddenBy: null,
      hiddenReason: null,
      needsReview: false,
      restoredAt: serverTimestamp(),
      restoredBy: currentUser.uid,
    });

    console.log(`[ContentActions] Restored ${itemType}:${itemId}`);
    return { success: true };
  } catch (error: any) {
    console.error(`[ContentActions] Restore failed for ${itemType}:${itemId}`, error);
    return { success: false, error: error.message || "Failed to restore" };
  }
}

/**
 * Delete a comment (tip comment, feedback comment, etc.)
 * Comments often live in subcollections
 */
export async function deleteComment(
  parentType: "tip" | "feedback" | "question" | "photo",
  parentId: string,
  commentId: string,
  deletedByRole: DeletedByRole
): Promise<ContentActionResult> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    // Determine collection path
    let collectionPath: string;
    switch (parentType) {
      case "tip":
        collectionPath = `tips/${parentId}/comments`;
        break;
      case "feedback":
        collectionPath = `feedbackPosts/${parentId}/comments`;
        break;
      case "question":
        collectionPath = `questions/${parentId}/answers`;
        break;
      case "photo":
        collectionPath = `photoPosts/${parentId}/comments`;
        break;
      default:
        return { success: false, error: "Invalid parent type" };
    }

    const docRef = doc(db, collectionPath, commentId);

    // Soft delete
    await updateDoc(docRef, {
      isDeleted: true,
      deletedAt: serverTimestamp(),
      deletedByUserId: currentUser.uid,
      deletedByRole,
    });

    console.log(`[ContentActions] Deleted comment ${commentId} from ${parentType}:${parentId}`);
    return { success: true };
  } catch (error: any) {
    console.error(`[ContentActions] Comment delete failed`, error);
    return { success: false, error: error.message || "Failed to delete comment" };
  }
}

/**
 * Check if current user can delete content
 */
export function canDeleteContent(
  createdByUserId: string,
  currentUserId: string | undefined,
  canModerate: boolean
): { canDelete: boolean; asRole: DeletedByRole | null } {
  if (!currentUserId) {
    return { canDelete: false, asRole: null };
  }

  if (createdByUserId === currentUserId) {
    return { canDelete: true, asRole: "owner" };
  }

  if (canModerate) {
    return { canDelete: true, asRole: "moderator" }; // Caller should determine admin vs mod
  }

  return { canDelete: false, asRole: null };
}
