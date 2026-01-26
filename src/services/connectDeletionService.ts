/**
 * Connect Content Deletion Service
 * 
 * Centralized service for deleting Connect content (questions, tips, photos, feedback, gear reviews).
 * Supports both owner and admin deletion with proper error logging.
 */

import {
  doc,
  getDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  writeBatch,
} from "firebase/firestore";
import { ref, deleteObject } from "firebase/storage";
import { db, storage, auth } from "../config/firebase";

// ==================== Types ====================

interface DeleteResult {
  success: boolean;
  contentId: string;
  contentType: string;
  error?: {
    code: string;
    message: string;
  };
}

interface CanDeleteResult {
  canDelete: boolean;
  isOwner: boolean;
  isAdmin: boolean;
  reason?: string;
}

// ==================== Permission Checks ====================

/**
 * Check if current user can delete content
 * Returns detailed info about permissions
 */
export async function canUserDeleteContent(
  collectionName: string,
  docId: string,
  ownerField: string = "userId"
): Promise<CanDeleteResult> {
  const user = auth.currentUser;
  if (!user) {
    return { canDelete: false, isOwner: false, isAdmin: false, reason: "Not authenticated" };
  }

  try {
    // Get the content document
    const docRef = doc(db, collectionName, docId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return { canDelete: false, isOwner: false, isAdmin: false, reason: "Content not found" };
    }

    const data = docSnap.data();
    // Check multiple possible owner field names
    const ownerId = data[ownerField] || data.userId || data.authorId || data.ownerUid;
    const isOwner = ownerId === user.uid;

    // Get user profile to check admin status (check both profiles and users collections)
    let profileData = null;
    let userData = null;
    
    try {
      const profileDoc = await getDoc(doc(db, "profiles", user.uid));
      profileData = profileDoc.exists() ? profileDoc.data() : null;
    } catch (err: any) {
      // Ignore errors fetching profile
    }
    
    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      userData = userDoc.exists() ? userDoc.data() : null;
    } catch (err: any) {
      // Ignore errors fetching user doc
    }
    
    // Check admin status from either collection OR by email
    const emailIsAdmin = user.email?.toLowerCase() === "alana@tentandlantern.com";
    
    const isAdmin = !!(
      (profileData && (
        profileData.isAdmin === true ||
        profileData.role === "admin" ||
        profileData.role === "administrator" ||
        profileData.membershipTier === "isAdmin"
      )) ||
      (userData && (
        userData.isAdmin === true ||
        userData.role === "admin" ||
        userData.role === "administrator" ||
        userData.membershipTier === "isAdmin"
      )) ||
      emailIsAdmin
    );

    return {
      canDelete: isOwner || isAdmin,
      isOwner,
      isAdmin,
    };
  } catch (error: any) {
    console.error(`[canUserDeleteContent] Error checking permissions for ${collectionName}/${docId}:`, {
      code: error.code,
      message: error.message,
    });
    return { canDelete: false, isOwner: false, isAdmin: false, reason: error.message };
  }
}

// ==================== Generic Delete Function ====================

/**
 * Delete content from a collection with proper error logging
 * Works for questions, tips, feedback, gear reviews, etc.
 */
export async function deleteConnectContent(
  collectionName: string,
  docId: string,
  ownerField: string = "userId"
): Promise<DeleteResult> {
  const logPrefix = `[deleteConnectContent:${collectionName}/${docId}]`;

  const user = auth.currentUser;
  if (!user) {
    console.error(`${logPrefix} Error: Not authenticated`);
    return {
      success: false,
      contentId: docId,
      contentType: collectionName,
      error: { code: "auth/not-authenticated", message: "Must be signed in to delete content" },
    };
  }

  try {
    // Check permissions first
    const { canDelete, isOwner, isAdmin } = await canUserDeleteContent(collectionName, docId, ownerField);
    
    // Direct email check for primary admin as fallback
    const isEmailAdmin = user.email?.toLowerCase() === "alana@tentandlantern.com";
    const finalCanDelete = canDelete || isEmailAdmin;

    if (!finalCanDelete) {
      console.error(`${logPrefix} Error: Permission denied`);
      return {
        success: false,
        contentId: docId,
        contentType: collectionName,
        error: { code: "permission-denied", message: "You don't have permission to delete this content" },
      };
    }

    // Delete the document
    const docRef = doc(db, collectionName, docId);
    await deleteDoc(docRef);

    console.log(`${logPrefix} Successfully deleted`);
    return {
      success: true,
      contentId: docId,
      contentType: collectionName,
    };
  } catch (error: any) {
    console.error(`${logPrefix} Error:`, {
      code: error.code || "unknown",
      message: error.message || "Unknown error",
      fullError: error,
    });
    return {
      success: false,
      contentId: docId,
      contentType: collectionName,
      error: {
        code: error.code || "unknown",
        message: error.message || "Failed to delete content",
      },
    };
  }
}

// ==================== Content-Specific Delete Functions ====================

/**
 * Delete a question and optionally its answers
 */
export async function deleteQuestion(questionId: string): Promise<DeleteResult> {
  const logPrefix = `[deleteQuestion:${questionId}]`;
  
  const result = await deleteConnectContent("questions", questionId, "userId");
  
  if (result.success) {
    // Try to clean up answers subcollection (best effort)
    try {
      const answersRef = collection(db, "questions", questionId, "answers");
      const answersSnap = await getDocs(answersRef);
      if (!answersSnap.empty) {
        const batch = writeBatch(db);
        answersSnap.docs.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
        console.log(`${logPrefix} Cleaned up ${answersSnap.size} answers`);
      }
    } catch (err) {
      console.warn(`${logPrefix} Could not clean up answers (may already be deleted):`, err);
    }
  }

  return result;
}

/**
 * Delete a tip and optionally its comments
 */
export async function deleteTip(tipId: string): Promise<DeleteResult> {
  const logPrefix = `[deleteTip:${tipId}]`;
  
  // Check which collection the tip exists in
  const communityTipRef = doc(db, "communityTips", tipId);
  const legacyTipRef = doc(db, "tips", tipId);
  
  const [communitySnap, legacySnap] = await Promise.all([
    getDoc(communityTipRef),
    getDoc(legacyTipRef),
  ]);
  
  let result: DeleteResult;
  
  if (communitySnap.exists()) {
    result = await deleteConnectContent("communityTips", tipId, "userId");
  } else if (legacySnap.exists()) {
    result = await deleteConnectContent("tips", tipId, "userId");
  } else {
    console.error(`${logPrefix} Tip not found in either collection`);
    return {
      success: false,
      contentId: tipId,
      contentType: "tip",
      error: { code: "not-found", message: "Tip not found" },
    };
  }

  if (result.success) {
    // Try to clean up comments (best effort)
    try {
      const commentsQuery = query(collection(db, "tipComments"), where("tipId", "==", tipId));
      const commentsSnap = await getDocs(commentsQuery);
      if (!commentsSnap.empty) {
        const batch = writeBatch(db);
        commentsSnap.docs.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
        console.log(`${logPrefix} Cleaned up ${commentsSnap.size} comments`);
      }
    } catch (err) {
      console.warn(`${logPrefix} Could not clean up comments:`, err);
    }
  }

  return result;
}

/**
 * Delete a gear review
 */
export async function deleteGearReview(reviewId: string): Promise<DeleteResult> {
  return deleteConnectContent("gearReviews", reviewId, "userId");
}

/**
 * Delete a feedback post
 */
export async function deleteFeedback(feedbackId: string): Promise<DeleteResult> {
  // Try feedbackPosts first, then feedback (legacy)
  let result = await deleteConnectContent("feedbackPosts", feedbackId, "userId");
  
  if (!result.success && result.error?.message?.includes("not found")) {
    result = await deleteConnectContent("feedback", feedbackId, "userId");
  }

  return result;
}

/**
 * Delete a photo post with storage cleanup
 */
export async function deletePhotoPost(photoId: string): Promise<DeleteResult> {
  const logPrefix = `[deletePhotoPost:${photoId}]`;
  console.log(`${logPrefix} Starting delete...`);

  const user = auth.currentUser;
  if (!user) {
    console.error(`${logPrefix} Error: Not authenticated`);
    return {
      success: false,
      contentId: photoId,
      contentType: "photoPosts",
      error: { code: "auth/not-authenticated", message: "Must be signed in to delete photos" },
    };
  }

  try {
    // Check permissions (just to log - actual check happens below after fetching doc)
    const permissionCheck = await canUserDeleteContent("photoPosts", photoId, "userId");
    console.log(`${logPrefix} Initial permission check:`, permissionCheck);
    
    // Also check stories collection if not found in photoPosts
    let docRef = doc(db, "photoPosts", photoId);
    let docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      docRef = doc(db, "stories", photoId);
      docSnap = await getDoc(docRef);
    }

    if (!docSnap.exists()) {
      return {
        success: false,
        contentId: photoId,
        contentType: "photoPosts",
        error: { code: "not-found", message: "Photo not found" },
      };
    }

    const photoData = docSnap.data();
    const ownerId = photoData.userId || photoData.ownerUid || photoData.authorId;
    
    // Re-check permissions with actual owner
    const userDoc = await getDoc(doc(db, "profiles", user.uid));
    const userData = userDoc.exists() ? userDoc.data() : null;
    const userIsAdmin = !!(userData && (
      userData.isAdmin === true ||
      userData.role === "admin" ||
      userData.role === "administrator" ||
      userData.membershipTier === "isAdmin"
    ));
    const userIsOwner = ownerId === user.uid;

    console.log(`${logPrefix} Permission check:`, { 
      canDelete: userIsOwner || userIsAdmin, 
      isOwner: userIsOwner, 
      isAdmin: userIsAdmin,
      userId: user.uid,
      ownerId,
    });

    if (!userIsOwner && !userIsAdmin) {
      return {
        success: false,
        contentId: photoId,
        contentType: "photoPosts",
        error: { code: "permission-denied", message: "You don't have permission to delete this photo" },
      };
    }

    // Delete from Storage first (best effort)
    const storagePaths = photoData.storagePaths || [];
    const storagePath = photoData.storagePath;
    const allPaths = storagePath ? [storagePath, ...storagePaths] : storagePaths;

    for (const path of allPaths) {
      try {
        const storageRef = ref(storage, path);
        await deleteObject(storageRef);
        console.log(`${logPrefix} Deleted from Storage: ${path}`);
      } catch (storageErr: any) {
        console.warn(`${logPrefix} Could not delete from Storage (${path}):`, {
          code: storageErr.code,
          message: storageErr.message,
        });
      }
    }

    // Delete the Firestore document
    await deleteDoc(docRef);

    console.log(`${logPrefix} Successfully deleted`);
    return {
      success: true,
      contentId: photoId,
      contentType: "photoPosts",
    };
  } catch (error: any) {
    console.error(`${logPrefix} Error:`, {
      code: error.code || "unknown",
      message: error.message || "Unknown error",
      fullError: error,
    });
    return {
      success: false,
      contentId: photoId,
      contentType: "photoPosts",
      error: {
        code: error.code || "unknown",
        message: error.message || "Failed to delete photo",
      },
    };
  }
}

/**
 * Delete a comment from any collection
 */
export async function deleteComment(
  commentId: string,
  commentCollection: string = "tipComments"
): Promise<DeleteResult> {
  return deleteConnectContent(commentCollection, commentId, "userId");
}

/**
 * Delete an answer to a question
 */
export async function deleteAnswer(questionId: string, answerId: string): Promise<DeleteResult> {
  const logPrefix = `[deleteAnswer:${questionId}/${answerId}]`;
  
  console.log(`${logPrefix} Starting delete...`);

  const user = auth.currentUser;
  if (!user) {
    return {
      success: false,
      contentId: answerId,
      contentType: "answer",
      error: { code: "auth/not-authenticated", message: "Must be signed in" },
    };
  }

  try {
    const answerRef = doc(db, "questions", questionId, "answers", answerId);
    const answerSnap = await getDoc(answerRef);

    if (!answerSnap.exists()) {
      return {
        success: false,
        contentId: answerId,
        contentType: "answer",
        error: { code: "not-found", message: "Answer not found" },
      };
    }

    const answerData = answerSnap.data();
    const ownerId = answerData.userId;

    // Check admin status
    const userDoc = await getDoc(doc(db, "profiles", user.uid));
    const userData = userDoc.exists() ? userDoc.data() : null;
    const isAdmin = !!(userData && (
      userData.isAdmin === true ||
      userData.role === "admin" ||
      userData.role === "administrator" ||
      userData.membershipTier === "isAdmin"
    ));
    const isOwner = ownerId === user.uid;

    if (!isOwner && !isAdmin) {
      return {
        success: false,
        contentId: answerId,
        contentType: "answer",
        error: { code: "permission-denied", message: "You don't have permission to delete this answer" },
      };
    }

    await deleteDoc(answerRef);

    console.log(`${logPrefix} Successfully deleted`);
    return {
      success: true,
      contentId: answerId,
      contentType: "answer",
    };
  } catch (error: any) {
    console.error(`${logPrefix} Error:`, {
      code: error.code || "unknown",
      message: error.message || "Unknown error",
    });
    return {
      success: false,
      contentId: answerId,
      contentType: "answer",
      error: {
        code: error.code || "unknown",
        message: error.message || "Failed to delete answer",
      },
    };
  }
}
