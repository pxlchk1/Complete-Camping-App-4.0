/**
 * Pro Attempt Tracking Service
 * 
 * Tracks when GUEST/FREE users attempt Pro-gated actions.
 * Used to trigger the "nudge" paywall variant on the 3rd attempt.
 * 
 * Storage:
 * - Logged-in users: Firestore user doc (proAttemptCount, lastProNudgeShownAt)
 * - Guests: AsyncStorage
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { doc, getDoc, updateDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { db, auth } from "../config/firebase";

// AsyncStorage keys for guests
const GUEST_PRO_ATTEMPT_COUNT_KEY = "@proAttemptCount";
const GUEST_LAST_NUDGE_SHOWN_KEY = "@lastProNudgeShownAt";

// Nudge frequency cap: 30 days in milliseconds
const NUDGE_FREQUENCY_CAP_MS = 30 * 24 * 60 * 60 * 1000;

// The attempt number that triggers the nudge
const NUDGE_TRIGGER_ATTEMPT = 3;

export interface ProAttemptState {
  proAttemptCount: number;
  lastProNudgeShownAt: Date | null;
}

/**
 * Get the current Pro attempt state for the user
 */
export async function getProAttemptState(): Promise<ProAttemptState> {
  const user = auth.currentUser;

  if (user) {
    // Logged-in user: read from Firestore
    try {
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const data = userSnap.data();
        return {
          proAttemptCount: data.proAttemptCount || 0,
          lastProNudgeShownAt: data.lastProNudgeShownAt?.toDate() || null,
        };
      }
    } catch (error) {
      console.error("[ProAttempt] Error reading from Firestore:", error);
    }

    return { proAttemptCount: 0, lastProNudgeShownAt: null };
  } else {
    // Guest: read from AsyncStorage
    try {
      const [countStr, timestampStr] = await Promise.all([
        AsyncStorage.getItem(GUEST_PRO_ATTEMPT_COUNT_KEY),
        AsyncStorage.getItem(GUEST_LAST_NUDGE_SHOWN_KEY),
      ]);

      return {
        proAttemptCount: countStr ? parseInt(countStr, 10) : 0,
        lastProNudgeShownAt: timestampStr ? new Date(timestampStr) : null,
      };
    } catch (error) {
      console.error("[ProAttempt] Error reading from AsyncStorage:", error);
      return { proAttemptCount: 0, lastProNudgeShownAt: null };
    }
  }
}

/**
 * Increment the Pro attempt count
 * Called when a GUEST/FREE user is blocked by Pro gating
 */
export async function incrementProAttemptCount(): Promise<number> {
  const user = auth.currentUser;

  if (user) {
    // Logged-in user: update Firestore
    try {
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      const currentCount = userSnap.exists() ? (userSnap.data().proAttemptCount || 0) : 0;
      const newCount = currentCount + 1;

      await updateDoc(userRef, {
        proAttemptCount: newCount,
      });

      console.log("[ProAttempt] Incremented count to:", newCount);
      return newCount;
    } catch (error) {
      console.error("[ProAttempt] Error updating Firestore:", error);
      return 0;
    }
  } else {
    // Guest: update AsyncStorage
    try {
      const countStr = await AsyncStorage.getItem(GUEST_PRO_ATTEMPT_COUNT_KEY);
      const currentCount = countStr ? parseInt(countStr, 10) : 0;
      const newCount = currentCount + 1;

      await AsyncStorage.setItem(GUEST_PRO_ATTEMPT_COUNT_KEY, newCount.toString());

      console.log("[ProAttempt] Incremented guest count to:", newCount);
      return newCount;
    } catch (error) {
      console.error("[ProAttempt] Error updating AsyncStorage:", error);
      return 0;
    }
  }
}

/**
 * Record that the nudge was shown (sets lastProNudgeShownAt to now)
 */
export async function recordNudgeShown(): Promise<void> {
  const user = auth.currentUser;
  const now = new Date();

  if (user) {
    // Logged-in user: update Firestore
    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        lastProNudgeShownAt: serverTimestamp(),
      });
      console.log("[ProAttempt] Recorded nudge shown in Firestore");
    } catch (error) {
      console.error("[ProAttempt] Error recording nudge in Firestore:", error);
    }
  } else {
    // Guest: update AsyncStorage
    try {
      await AsyncStorage.setItem(GUEST_LAST_NUDGE_SHOWN_KEY, now.toISOString());
      console.log("[ProAttempt] Recorded nudge shown in AsyncStorage");
    } catch (error) {
      console.error("[ProAttempt] Error recording nudge in AsyncStorage:", error);
    }
  }
}

/**
 * Check if the nudge is rate-limited (shown within last 30 days)
 */
export function isNudgeRateLimited(lastProNudgeShownAt: Date | null): boolean {
  if (!lastProNudgeShownAt) {
    return false;
  }

  const now = new Date();
  const timeSinceLastNudge = now.getTime() - lastProNudgeShownAt.getTime();
  return timeSinceLastNudge < NUDGE_FREQUENCY_CAP_MS;
}

/**
 * Determine if we should show the nudge_trial variant
 * 
 * Criteria:
 * 1. proAttemptCount === 3 (exactly the 3rd attempt)
 * 2. Nudge not rate-limited (not shown in last 30 days)
 * 
 * Note: This is called BEFORE incrementing the count, so we check for count === 2
 * (meaning the NEXT increment will be attempt #3)
 */
export async function shouldShowNudgeVariant(): Promise<boolean> {
  const state = await getProAttemptState();
  
  // We're about to increment, so current count + 1 = the attempt number
  const nextAttemptNumber = state.proAttemptCount + 1;
  
  if (nextAttemptNumber !== NUDGE_TRIGGER_ATTEMPT) {
    return false;
  }

  if (isNudgeRateLimited(state.lastProNudgeShownAt)) {
    console.log("[ProAttempt] Nudge rate-limited, not showing nudge variant");
    return false;
  }

  return true;
}

/**
 * Get the paywall variant to show based on Pro attempt state
 * Also increments the counter and records nudge if applicable
 * 
 * @param isAuthenticated - Whether user is logged in (optional, used for early exit)
 * @param isPro - Whether user has Pro subscription (optional, if true skips tracking)
 * @returns "nudge_trial" | "standard"
 */
export type PaywallVariant = "nudge_trial" | "standard";

export async function getPaywallVariantAndTrack(
  _isAuthenticated?: boolean,
  isPro?: boolean
): Promise<PaywallVariant> {
  // If user is Pro, don't track attempts (they won't see the paywall anyway)
  if (isPro) {
    return "standard";
  }

  const showNudge = await shouldShowNudgeVariant();
  
  // Increment the counter
  await incrementProAttemptCount();
  
  if (showNudge) {
    // Record that we showed the nudge
    await recordNudgeShown();
    return "nudge_trial";
  }
  
  return "standard";
}

/**
 * Migrate guest Pro attempt data to user account after login
 * Call this after a guest creates an account or logs in
 */
export async function migrateGuestProAttemptData(userId: string): Promise<void> {
  try {
    const [countStr, timestampStr] = await Promise.all([
      AsyncStorage.getItem(GUEST_PRO_ATTEMPT_COUNT_KEY),
      AsyncStorage.getItem(GUEST_LAST_NUDGE_SHOWN_KEY),
    ]);

    if (!countStr && !timestampStr) {
      return; // No guest data to migrate
    }

    const guestCount = countStr ? parseInt(countStr, 10) : 0;
    const guestLastNudge = timestampStr ? new Date(timestampStr) : null;

    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const userData = userSnap.data();
      const existingCount = userData.proAttemptCount || 0;

      // Merge: take the higher count and earliest lastNudgeShown
      const mergedCount = Math.max(existingCount, guestCount);
      
      const updates: Record<string, any> = {
        proAttemptCount: mergedCount,
      };

      // Only update lastProNudgeShownAt if guest had one and user doesn't
      if (guestLastNudge && !userData.lastProNudgeShownAt) {
        updates.lastProNudgeShownAt = Timestamp.fromDate(guestLastNudge);
      }

      await updateDoc(userRef, updates);
    }

    // Clear guest data after migration
    await Promise.all([
      AsyncStorage.removeItem(GUEST_PRO_ATTEMPT_COUNT_KEY),
      AsyncStorage.removeItem(GUEST_LAST_NUDGE_SHOWN_KEY),
    ]);

    console.log("[ProAttempt] Migrated guest Pro attempt data to user:", userId);
  } catch (error) {
    console.error("[ProAttempt] Error migrating guest data:", error);
  }
}
