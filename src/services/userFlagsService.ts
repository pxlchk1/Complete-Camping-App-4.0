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
  HAS_SEEN_WELCOME_HOME: "hasSeenWelcomeHome",
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

// ============================================
// HOME WELCOME (First Visit vs. Returning)
// ============================================

export interface HomeWelcomeData {
  hasSeenWelcomeHome: boolean;
  firstName: string | null;
  lastLoginAt: any;
  homeWelcomeLastShownAt: any;
}

/**
 * Get the home welcome data for a user
 */
export async function getHomeWelcomeData(): Promise<HomeWelcomeData | null> {
  const user = auth.currentUser;
  if (!user) return null;

  try {
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const data = userSnap.data();
      return {
        hasSeenWelcomeHome: data?.[USER_FLAGS.HAS_SEEN_WELCOME_HOME] === true,
        firstName: data?.firstName || null,
        lastLoginAt: data?.lastLoginAt || null,
        homeWelcomeLastShownAt: data?.homeWelcomeLastShownAt || null,
      };
    }
    return {
      hasSeenWelcomeHome: false,
      firstName: null,
      lastLoginAt: null,
      homeWelcomeLastShownAt: null,
    };
  } catch (error) {
    console.error("[UserFlags] Error getting home welcome data:", error);
    return null;
  }
}

/**
 * Mark that user has seen the first-time welcome on Home
 * This should be called only once when hasSeenWelcomeHome is false
 */
export async function setHomeWelcomeSeen(): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;

  try {
    const userRef = doc(db, "users", user.uid);
    await setDoc(userRef, {
      [USER_FLAGS.HAS_SEEN_WELCOME_HOME]: true,
      homeWelcomeLastShownAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true });
    console.log("[UserFlags] Marked hasSeenWelcomeHome = true");
  } catch (error) {
    console.error("[UserFlags] Error setting hasSeenWelcomeHome:", error);
  }
}

/**
 * Update user's firstName in the users collection
 */
export async function updateUserFirstName(firstName: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;

  try {
    const userRef = doc(db, "users", user.uid);
    await setDoc(userRef, {
      firstName: firstName.trim() || null,
      updatedAt: serverTimestamp(),
    }, { merge: true });
    console.log("[UserFlags] Updated firstName:", firstName);
  } catch (error) {
    console.error("[UserFlags] Error updating firstName:", error);
  }
}

/**
 * Update lastLoginAt timestamp
 */
export async function updateLastLogin(): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;

  try {
    const userRef = doc(db, "users", user.uid);
    await setDoc(userRef, {
      lastLoginAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    console.error("[UserFlags] Error updating lastLoginAt:", error);
  }
}
