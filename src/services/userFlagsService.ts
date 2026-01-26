/**
 * User Flags Service
 * 
 * Manages boolean flags for user experience state (e.g., first-time modals shown).
 * Stored in Firestore on the user document.
 */

import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../config/firebase";

// Flag keys
export const USER_FLAGS = {
  HAS_SEEN_MY_CAMPGROUND_INFO: "hasSeenMyCampgroundInfoModal",
  HAS_SEEN_MY_CAMPSITE_WELCOME: "hasSeenMyCampsiteWelcomeModal",
} as const;

/**
 * Check if user has seen the My Campground info modal
 */
export async function hasSeenMyCampgroundInfo(): Promise<boolean> {
  const user = auth.currentUser;
  if (!user) return false;

  try {
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      return userSnap.data()?.[USER_FLAGS.HAS_SEEN_MY_CAMPGROUND_INFO] === true;
    }
    return false;
  } catch (error) {
    console.error("[UserFlags] Error checking hasSeenMyCampgroundInfo:", error);
    return false;
  }
}

/**
 * Mark that user has seen the My Campground info modal
 */
export async function setMyCampgroundInfoSeen(): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;

  try {
    const userRef = doc(db, "users", user.uid);
    await setDoc(userRef, {
      [USER_FLAGS.HAS_SEEN_MY_CAMPGROUND_INFO]: true,
      updatedAt: serverTimestamp(),
    }, { merge: true });
    console.log("[UserFlags] Marked hasSeenMyCampgroundInfoModal = true");
  } catch (error) {
    console.error("[UserFlags] Error setting hasSeenMyCampgroundInfoModal:", error);
  }
}

/**
 * Check and optionally set the My Campground info modal flag
 * Returns true if modal should be shown (first time), false otherwise
 */
export async function checkAndSetMyCampgroundInfoSeen(): Promise<boolean> {
  const hasSeen = await hasSeenMyCampgroundInfo();
  
  if (!hasSeen) {
    // Mark as seen (will be set after modal is dismissed in the component)
    return true; // Should show modal
  }
  
  return false; // Already seen
}

// ============================================
// MY CAMPSITE WELCOME MODAL
// ============================================

/**
 * Check if user has seen the My Campsite welcome modal
 */
export async function hasSeenMyCampsiteWelcome(): Promise<boolean> {
  const user = auth.currentUser;
  if (!user) return true; // Don't show to guests

  try {
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      return userSnap.data()?.[USER_FLAGS.HAS_SEEN_MY_CAMPSITE_WELCOME] === true;
    }
    return false;
  } catch (error) {
    console.error("[UserFlags] Error checking hasSeenMyCampsiteWelcome:", error);
    return true; // On error, don't show modal to avoid blocking
  }
}

/**
 * Mark that user has seen the My Campsite welcome modal
 */
export async function setMyCampsiteWelcomeSeen(): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;

  try {
    const userRef = doc(db, "users", user.uid);
    await setDoc(userRef, {
      [USER_FLAGS.HAS_SEEN_MY_CAMPSITE_WELCOME]: true,
      updatedAt: serverTimestamp(),
    }, { merge: true });
    console.log("[UserFlags] Marked hasSeenMyCampsiteWelcomeModal = true");
  } catch (error) {
    console.error("[UserFlags] Error setting hasSeenMyCampsiteWelcomeModal:", error);
  }
}
