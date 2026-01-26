/**
 * Onboarding Tracking Service
 * Tracks user actions for the 30-day notification campaign
 */

import { doc, getDoc, setDoc, updateDoc, increment, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../config/firebase";
import {
  UserOnboarding,
  OnboardingCompletedActions,
  CORE_ACTIONS,
  NOTIFICATION_CONFIG,
} from "../types/notifications";

const USERS_COLLECTION = "users";

// ============================================
// INITIALIZE ONBOARDING
// ============================================

/**
 * Initialize onboarding data for a new user
 */
export async function initializeUserOnboarding(userId: string): Promise<void> {
  const userRef = doc(db, USERS_COLLECTION, userId);
  const userDoc = await getDoc(userRef);

  if (userDoc.exists() && userDoc.data()?.onboarding?.startedAt) {
    // Already initialized
    return;
  }

  const onboarding: UserOnboarding = {
    startedAt: serverTimestamp() as any,
    lastActiveAt: serverTimestamp() as any,
    pushesThisWeek: 0,
    weekStartedAt: serverTimestamp() as any,
    completedActions: {},
    counters: {
      gearItemsCount: 0,
      tripsCount: 0,
      savedPlacesCount: 0,
    },
  };

  await setDoc(
    userRef,
    { onboarding },
    { merge: true }
  );

  console.log("[OnboardingService] Initialized onboarding for user:", userId);
}

// ============================================
// TRACK USER ACTIVITY
// ============================================

/**
 * Update last active timestamp (call on app open)
 */
export async function trackUserActivity(): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;

  const userRef = doc(db, USERS_COLLECTION, user.uid);

  try {
    await updateDoc(userRef, {
      "onboarding.lastActiveAt": serverTimestamp(),
    });
  } catch {
    // User doc might not exist yet, initialize it
    await initializeUserOnboarding(user.uid);
  }
}

// ============================================
// TRACK COMPLETED ACTIONS
// ============================================

/**
 * Mark an action as completed
 */
export async function trackActionCompleted(actionKey: keyof OnboardingCompletedActions): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;

  const userRef = doc(db, USERS_COLLECTION, user.uid);

  try {
    await updateDoc(userRef, {
      [`onboarding.completedActions.${actionKey}`]: true,
      "onboarding.lastActiveAt": serverTimestamp(),
    });

    console.log("[OnboardingService] Tracked action:", actionKey);

    // Check if campaign should be completed
    await checkCampaignCompletion(user.uid);
  } catch (error) {
    console.error("[OnboardingService] Error tracking action:", error);
  }
}

/**
 * Increment a counter (gear items, trips, etc.)
 */
export async function incrementCounter(
  counterKey: "gearItemsCount" | "tripsCount" | "savedPlacesCount"
): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;

  const userRef = doc(db, USERS_COLLECTION, user.uid);

  try {
    await updateDoc(userRef, {
      [`onboarding.counters.${counterKey}`]: increment(1),
      "onboarding.lastActiveAt": serverTimestamp(),
    });

    // Check for gear items milestone
    if (counterKey === "gearItemsCount") {
      const userDoc = await getDoc(userRef);
      const count = userDoc.data()?.onboarding?.counters?.gearItemsCount || 0;
      if (count >= 5) {
        await trackActionCompleted("added5GearItems");
      }
    }

    // Check for trips milestone
    if (counterKey === "tripsCount") {
      await trackActionCompleted("createdTrip");
    }

    // Check for saved places
    if (counterKey === "savedPlacesCount") {
      await trackActionCompleted("savedPlace");
    }
  } catch (error) {
    console.error("[OnboardingService] Error incrementing counter:", error);
  }
}

// ============================================
// CAMPAIGN COMPLETION CHECK
// ============================================

/**
 * Check if the onboarding campaign should be marked as complete
 */
async function checkCampaignCompletion(userId: string): Promise<boolean> {
  const userRef = doc(db, USERS_COLLECTION, userId);
  const userDoc = await getDoc(userRef);

  if (!userDoc.exists()) return false;

  const onboarding = userDoc.data()?.onboarding as UserOnboarding | undefined;
  if (!onboarding || onboarding.campaignCompleted) return false;

  // Count completed core actions
  const completedCoreActions = CORE_ACTIONS.filter(
    (action) => onboarding.completedActions?.[action] === true
  ).length;

  if (completedCoreActions >= NOTIFICATION_CONFIG.coreActionsToComplete) {
    await updateDoc(userRef, {
      "onboarding.campaignCompleted": true,
      "onboarding.campaignCompletedReason": "2_core_actions",
      "onboarding.campaignCompletedAt": serverTimestamp(),
    });
    console.log("[OnboardingService] Campaign completed: 2 core actions");
    return true;
  }

  // Check if 30 days have passed
  const startedAt = onboarding.startedAt as any;
  if (startedAt?.toDate) {
    const daysSinceStart = Math.floor(
      (Date.now() - startedAt.toDate().getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSinceStart >= NOTIFICATION_CONFIG.campaignDurationDays) {
      await updateDoc(userRef, {
        "onboarding.campaignCompleted": true,
        "onboarding.campaignCompletedReason": "day_30",
        "onboarding.campaignCompletedAt": serverTimestamp(),
      });
      console.log("[OnboardingService] Campaign completed: day 30");
      return true;
    }
  }

  return false;
}

// ============================================
// GET ONBOARDING STATUS
// ============================================

/**
 * Get current onboarding status for a user
 */
export async function getOnboardingStatus(): Promise<UserOnboarding | null> {
  const user = auth.currentUser;
  if (!user) return null;

  const userRef = doc(db, USERS_COLLECTION, user.uid);
  const userDoc = await getDoc(userRef);

  if (!userDoc.exists()) return null;

  return userDoc.data()?.onboarding as UserOnboarding | undefined || null;
}

/**
 * Get the day number in onboarding (1-30+)
 */
export async function getOnboardingDay(): Promise<number> {
  const onboarding = await getOnboardingStatus();
  if (!onboarding?.startedAt) return 1;

  const startedAt = onboarding.startedAt as any;
  if (!startedAt?.toDate) return 1;

  const daysSinceStart = Math.floor(
    (Date.now() - startedAt.toDate().getTime()) / (1000 * 60 * 60 * 24)
  );

  return Math.max(1, daysSinceStart + 1); // Day 1 is first day
}

/**
 * Check if a specific action has been completed
 */
export async function isActionCompleted(actionKey: keyof OnboardingCompletedActions): Promise<boolean> {
  const onboarding = await getOnboardingStatus();
  return onboarding?.completedActions?.[actionKey] === true;
}

/**
 * Check if onboarding campaign is still active
 */
export async function isCampaignActive(): Promise<boolean> {
  const onboarding = await getOnboardingStatus();
  if (!onboarding) return false;
  return onboarding.campaignCompleted !== true;
}

// ============================================
// HELPER: TRACK SPECIFIC ACTIONS
// ============================================

export async function trackTripCreated(): Promise<void> {
  await incrementCounter("tripsCount");
}

export async function trackPackingListGenerated(): Promise<void> {
  await trackActionCompleted("generatedPackingList");
}

export async function trackGearItemAdded(): Promise<void> {
  await incrementCounter("gearItemsCount");
}

export async function trackPlaceSaved(): Promise<void> {
  await incrementCounter("savedPlacesCount");
}

export async function trackWeatherAddedToTrip(): Promise<void> {
  await trackActionCompleted("addedWeatherToTrip");
}

export async function trackBuddyInvited(): Promise<void> {
  await trackActionCompleted("invitedBuddy");
}

export async function trackMealPlanAdded(): Promise<void> {
  await trackActionCompleted("addedMealPlan");
}

export async function trackCustomPackingListSaved(): Promise<void> {
  await trackActionCompleted("savedCustomPackingList");
}

export async function trackCampingStyleSet(): Promise<void> {
  await trackActionCompleted("favoriteCampingStyleSet");
}

export async function trackCommunityPost(): Promise<void> {
  await trackActionCompleted("postedTipOrQuestion");
}
