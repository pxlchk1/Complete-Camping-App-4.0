/**
 * User Action Tracker Service
 * Tracks core actions and manages onboarding activation state
 * Increment counters, check thresholds, update lastActiveAt
 */

import { db } from "../config/firebase";
import { doc, getDoc, updateDoc, serverTimestamp, increment } from "firebase/firestore";
import { analyticsService } from "./analyticsService";

// ============================================
// CORE ACTION TYPES
// ============================================

export type CoreAction = 
  | "trip_created"
  | "packing_list_generated"
  | "gear_item_added"
  | "saved_place_added"
  | "weather_added"
  | "buddy_invited";

// ============================================
// ACTIVATION THRESHOLDS
// ============================================

export const ACTIVATION_THRESHOLD = 2; // User is "activated" after 2 core actions

// ============================================
// USER ACTION TRACKER SERVICE
// ============================================

class UserActionTrackerService {
  /**
   * Track a core action and update user counters
   * Returns true if this action caused user to become "activated"
   */
  async trackAction(userId: string, action: CoreAction): Promise<{ activated: boolean }> {
    if (!userId) {
      console.warn("[UserActionTracker] No userId provided");
      return { activated: false };
    }

    try {
      const userRef = doc(db, "users", userId);
      const userDocSnap = await getDoc(userRef);
      
      if (!userDocSnap.exists()) {
        console.warn("[UserActionTracker] User document not found:", userId);
        return { activated: false };
      }

      const userData = userDocSnap.data();
      const currentCoreActions = userData?.onboarding?.coreActionsCount || 0;
      const wasActivated = currentCoreActions >= ACTIVATION_THRESHOLD;
      const newCoreActions = currentCoreActions + 1;
      const nowActivated = newCoreActions >= ACTIVATION_THRESHOLD && !wasActivated;

      // Update user document
      const updateData: Record<string, any> = {
        lastActiveAt: serverTimestamp(),
        "onboarding.coreActionsCount": increment(1),
      };

      // Track specific action counters
      switch (action) {
        case "trip_created":
          updateData.tripsCreatedCount = increment(1);
          break;
        case "packing_list_generated":
          updateData.packingListsGeneratedCount = increment(1);
          break;
        case "gear_item_added":
          updateData.gearItemsAddedCount = increment(1);
          break;
        case "saved_place_added":
          updateData.savedPlacesCount = increment(1);
          break;
        case "buddy_invited":
          updateData.buddyInvitesSentCount = increment(1);
          break;
      }

      // If just became activated, mark activation
      if (nowActivated) {
        updateData["onboarding.activated"] = true;
        updateData["onboarding.activatedAt"] = serverTimestamp();
        
        // Track onboarding completed via 2 core actions
        await analyticsService.trackOnboardingCompleted("2_core_actions");
        console.log("[UserActionTracker] User activated via 2 core actions!");
      }

      await updateDoc(userRef, updateData);

      console.log(`[UserActionTracker] Tracked action: ${action}, coreActions: ${newCoreActions}, activated: ${nowActivated}`);
      
      return { activated: nowActivated };
    } catch (error) {
      console.error("[UserActionTracker] Failed to track action:", error);
      return { activated: false };
    }
  }

  /**
   * Update lastActiveAt timestamp
   */
  async updateLastActive(userId: string): Promise<void> {
    if (!userId) return;

    try {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        lastActiveAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("[UserActionTracker] Failed to update lastActiveAt:", error);
    }
  }

  /**
   * Get user activation status
   */
  async getActivationStatus(userId: string): Promise<{
    coreActionsCount: number;
    isActivated: boolean;
    pushEligible: boolean;
  }> {
    if (!userId) {
      return { coreActionsCount: 0, isActivated: false, pushEligible: false };
    }

    try {
      const userRef = doc(db, "users", userId);
      const userDocSnap = await getDoc(userRef);
      
      if (!userDocSnap.exists()) {
        return { coreActionsCount: 0, isActivated: false, pushEligible: false };
      }

      const userData = userDocSnap.data();
      const coreActionsCount = userData?.onboarding?.coreActionsCount || 0;
      const isActivated = coreActionsCount >= ACTIVATION_THRESHOLD;
      
      // Push eligible after 1+ core action (not cold start)
      const pushEligible = coreActionsCount >= 1;

      return { coreActionsCount, isActivated, pushEligible };
    } catch (error) {
      console.error("[UserActionTracker] Failed to get activation status:", error);
      return { coreActionsCount: 0, isActivated: false, pushEligible: false };
    }
  }

  /**
   * Check if user should see push permission soft prompt
   * Returns true if user has 1+ core action and hasn't been prompted
   */
  async shouldShowPushPrompt(userId: string): Promise<boolean> {
    if (!userId) return false;

    try {
      const userRef = doc(db, "users", userId);
      const userDocSnap = await getDoc(userRef);
      
      if (!userDocSnap.exists()) return false;

      const userData = userDocSnap.data();
      
      // Check if already granted or denied OS permission
      const permissionStatus = userData?.notificationPermissionStatus;
      if (permissionStatus === "granted" || permissionStatus === "denied") {
        return false;
      }

      // Check if already shown soft prompt
      if (userData?.softPushPromptShown) {
        return false;
      }

      // Check if has at least 1 core action
      const coreActionsCount = userData?.onboarding?.coreActionsCount || 0;
      return coreActionsCount >= 1;
    } catch (error) {
      console.error("[UserActionTracker] Failed to check push prompt status:", error);
      return false;
    }
  }

  /**
   * Mark soft push prompt as shown
   */
  async markSoftPromptShown(userId: string): Promise<void> {
    if (!userId) return;

    try {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        softPushPromptShown: true,
        softPushPromptShownAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("[UserActionTracker] Failed to mark soft prompt shown:", error);
    }
  }

  /**
   * Get total trips created count for a user
   * Used for paywall gating - free users get ONE trip ever, not one at a time
   */
  async getTripsCreatedCount(userId: string): Promise<number> {
    if (!userId) return 0;

    try {
      const userRef = doc(db, "users", userId);
      const userDocSnap = await getDoc(userRef);
      
      if (!userDocSnap.exists()) return 0;

      const userData = userDocSnap.data();
      return userData?.tripsCreatedCount || 0;
    } catch (error) {
      console.error("[UserActionTracker] Failed to get trips created count:", error);
      return 0;
    }
  }
}

// Export singleton instance
export const userActionTracker = new UserActionTrackerService();

// Convenience exports
export const trackCoreAction = (userId: string, action: CoreAction) => 
  userActionTracker.trackAction(userId, action);
export const updateLastActive = (userId: string) => 
  userActionTracker.updateLastActive(userId);
export const getActivationStatus = (userId: string) => 
  userActionTracker.getActivationStatus(userId);
export const shouldShowPushPrompt = (userId: string) => 
  userActionTracker.shouldShowPushPrompt(userId);
export const markSoftPromptShown = (userId: string) => 
  userActionTracker.markSoftPromptShown(userId);
export const getTripsCreatedCount = (userId: string) =>
  userActionTracker.getTripsCreatedCount(userId);
