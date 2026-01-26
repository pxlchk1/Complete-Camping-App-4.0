/**
 * Photo Deletion Service
 * Provides a unified interface for deleting photos with proper permissions
 * Supports both client-side deletion and Cloud Function (for bulletproof admin deletion)
 */

import { httpsCallable } from "firebase/functions";
import { doc, getDoc, writeBatch, collection, query, where, getDocs } from "firebase/firestore";
import { ref, deleteObject } from "firebase/storage";
import { db, storage, functions, auth } from "../config/firebase";

interface DeletePhotoResult {
  success: boolean;
  photoId: string;
  method: "client" | "cloudFunction";
  error?: string;
}

/**
 * Check if a user can delete a specific photo
 */
export async function canUserDeletePhoto(
  photoId: string,
  userId: string
): Promise<{ canDelete: boolean; isOwner: boolean; isAdmin: boolean }> {
  try {
    // Get photo document
    const photoRef = doc(db, "stories", photoId);
    const photoDoc = await getDoc(photoRef);

    if (!photoDoc.exists()) {
      return { canDelete: false, isOwner: false, isAdmin: false };
    }

    const photoData = photoDoc.data();
    const ownerId = photoData.ownerUid || photoData.userId || photoData.authorId;
    const isOwner = ownerId === userId;

    // Check admin status
    const userDoc = await getDoc(doc(db, "users", userId));
    const userData = userDoc.exists() ? userDoc.data() : null;
    const isAdmin = userData && (
      userData.isAdmin === true ||
      userData.role === "admin" ||
      userData.role === "administrator"
    );

    return {
      canDelete: isOwner || !!isAdmin,
      isOwner,
      isAdmin: !!isAdmin,
    };
  } catch (error) {
    console.error("[canUserDeletePhoto] Error:", error);
    return { canDelete: false, isOwner: false, isAdmin: false };
  }
}

/**
 * Delete a photo using client-side deletion
 * Works for owners and admins (subject to Firestore/Storage rules)
 */
export async function deletePhotoClient(photoId: string): Promise<DeletePhotoResult> {
  const user = auth.currentUser;
  if (!user) {
    return { success: false, photoId, method: "client", error: "Not authenticated" };
  }

  try {
    // Get photo document
    const photoRef = doc(db, "stories", photoId);
    const photoDoc = await getDoc(photoRef);

    if (!photoDoc.exists()) {
      return { success: false, photoId, method: "client", error: "Photo not found" };
    }

    const photoData = photoDoc.data();
    const ownerId = photoData.ownerUid || photoData.userId || photoData.authorId;

    // Permission check
    const { canDelete } = await canUserDeletePhoto(photoId, user.uid);
    if (!canDelete) {
      return { success: false, photoId, method: "client", error: "Permission denied" };
    }

    // Step 1: Delete from Storage
    const storagePath = photoData.storagePath;
    if (storagePath) {
      try {
        const storageRef = ref(storage, storagePath);
        await deleteObject(storageRef);
        console.log("[deletePhotoClient] Deleted from Storage:", storagePath);
      } catch (storageError: any) {
        console.warn("[deletePhotoClient] Storage delete error (continuing):", storageError?.message);
      }
    } else {
      // Fallback patterns
      const patterns = [
        `stories/${ownerId}/${photoId}`,
        `stories/${ownerId}/${photoId}.jpg`,
      ];
      for (const pattern of patterns) {
        try {
          const storageRef = ref(storage, pattern);
          await deleteObject(storageRef);
          break;
        } catch {
          // Try next
        }
      }
    }

    // Step 2: Delete votes
    const batch = writeBatch(db);
    
    const storyVotesQuery = query(collection(db, "storyVotes"), where("photoId", "==", photoId));
    const storyVotesSnapshot = await getDocs(storyVotesQuery);
    storyVotesSnapshot.docs.forEach((voteDoc) => batch.delete(voteDoc.ref));

    const photoVotesQuery = query(collection(db, "photoVotes"), where("photoId", "==", photoId));
    const photoVotesSnapshot = await getDocs(photoVotesQuery);
    photoVotesSnapshot.docs.forEach((voteDoc) => batch.delete(voteDoc.ref));

    // Step 3: Delete photo document
    batch.delete(photoRef);
    await batch.commit();

    console.log("[deletePhotoClient] Successfully deleted photo:", photoId);
    return { success: true, photoId, method: "client" };
  } catch (error: any) {
    console.error("[deletePhotoClient] Error:", error?.message || error);
    return { success: false, photoId, method: "client", error: error?.message || "Unknown error" };
  }
}

/**
 * Delete a photo using Cloud Function (more reliable for admins)
 * Bypasses client-side permission edge cases
 */
export async function deletePhotoCloudFunction(photoId: string): Promise<DeletePhotoResult> {
  const user = auth.currentUser;
  if (!user) {
    return { success: false, photoId, method: "cloudFunction", error: "Not authenticated" };
  }

  try {
    const deletePhotoSecure = httpsCallable<{ photoId: string }, { success: boolean; photoId: string }>(
      functions,
      "deletePhotoSecure"
    );

    const result = await deletePhotoSecure({ photoId });
    
    console.log("[deletePhotoCloudFunction] Successfully deleted photo:", photoId);
    return { success: result.data.success, photoId, method: "cloudFunction" };
  } catch (error: any) {
    console.error("[deletePhotoCloudFunction] Error:", error?.message || error);
    
    // Extract error message from Firebase functions error
    const errorMessage = error?.message || error?.details || "Unknown error";
    return { success: false, photoId, method: "cloudFunction", error: errorMessage };
  }
}

/**
 * Smart delete - tries client first, falls back to Cloud Function
 * Best for general use
 */
export async function deletePhotoSmart(photoId: string): Promise<DeletePhotoResult> {
  // Try client-side first (faster, works for most cases)
  const clientResult = await deletePhotoClient(photoId);
  
  if (clientResult.success) {
    return clientResult;
  }

  // If client failed due to permissions, try Cloud Function
  if (clientResult.error?.includes("permission") || clientResult.error?.includes("Permission")) {
    console.log("[deletePhotoSmart] Client failed, trying Cloud Function...");
    return deletePhotoCloudFunction(photoId);
  }

  // Return client error if not a permission issue
  return clientResult;
}
