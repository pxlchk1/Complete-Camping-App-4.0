/**
 * User Action Tracker Service
 * Tracks core actions and manages onboarding activation state
 * Increment counters, check thresholds, update lastActiveAt
 */

import { db } from "../config/firebase";
import { doc, getDoc, updateDoc, setDoc, serverTimestamp, increment } from "firebase/firestore";
import { analyticsService } from "./analyticsService";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";

// Version key for push permission prompt - bump this to re-prompt all users
const PUSH_PROMPT_VERSION = "v1";
const PUSH_PROMPT_STORAGE_KEY = `@push_permission_prompted_${PUSH_PROMPT_VERSION}`;

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
   * Shows immediately for new users and existing users who haven't been prompted
   * Handles both new downloads and app updates
   */
  async shouldShowPushPrompt(userId: string): Promise<boolean> {
    console.log("[PushPrompt] Checking for userId:", userId);
    
    if (!userId) {
      console.log("[PushPrompt] No userId, skipping");
      return false;
    }

    // Skip if not a physical device (push doesn't work on simulators)
    if (!Device.isDevice) {
      console.log("[PushPrompt] Not a physical device, skipping");
      return false;
    }

    try {
      // First check: OS-level permission status
      // If already granted or denied, no need to show our soft prompt
      const { status: osPermissionStatus } = await Notifications.getPermissionsAsync();
      console.log("[PushPrompt] OS permission status:", osPermissionStatus);
      if (osPermissionStatus === "granted" || osPermissionStatus === "denied") {
        console.log("[PushPrompt] OS permission already set, skipping prompt");
        return false;
      }

      // Second check: Local AsyncStorage (fast, works across devices for same user)
      // This handles app updates - if we've prompted in this version, don't prompt again
      const localPromptShown = await AsyncStorage.getItem(PUSH_PROMPT_STORAGE_KEY);
      console.log("[PushPrompt] AsyncStorage value:", localPromptShown, "current userId:", userId);
      if (localPromptShown === userId) {
        console.log("[PushPrompt] Already prompted this user locally, skipping");
        return false;
      }

      // Third check: Firestore (handles cross-device sync)
      const userRef = doc(db, "users", userId);
      const userDocSnap = await getDoc(userRef);
      
      // If user doc exists, check if already prompted
      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        console.log("[PushPrompt] Firestore softPushPromptShown:", userData?.softPushPromptShown);
        if (userData?.softPushPromptShown) {
          // Sync to local storage for faster future checks
          await AsyncStorage.setItem(PUSH_PROMPT_STORAGE_KEY, userId);
          console.log("[PushPrompt] Already prompted in Firestore, skipping");
          return false;
        }
      } else {
        console.log("[PushPrompt] User doc does not exist in Firestore");
      }

      // No existing prompt record - show the prompt!
      // This covers: new users, existing users who update, cross-device scenarios
      console.log("[PushPrompt] ✅ Will show prompt!");
      return true;
    } catch (error) {
      console.error("[UserActionTracker] Failed to check push prompt status:", error);
      // On error, don't show prompt to avoid poor UX
      return false;
    }
  }

  /**
   * Mark soft push prompt as shown (saves to both AsyncStorage and Firestore)
   */
  async markSoftPromptShown(userId: string): Promise<void> {
    if (!userId) return;

    try {
      // Save to local AsyncStorage for fast future checks
      await AsyncStorage.setItem(PUSH_PROMPT_STORAGE_KEY, userId);

      // Save to Firestore for cross-device sync
      const userRef = doc(db, "users", userId);
      const userDocSnap = await getDoc(userRef);

      if (userDocSnap.exists()) {
        await updateDoc(userRef, {
          softPushPromptShown: true,
          softPushPromptShownAt: serverTimestamp(),
        });
      } else {
        // User doc doesn't exist yet (edge case) - create it with minimal data
        await setDoc(userRef, {
          softPushPromptShown: true,
          softPushPromptShownAt: serverTimestamp(),
        }, { merge: true });
      }
    } catch (error) {
      console.error("[UserActionTracker] Failed to mark soft prompt shown:", error);
      // Still mark locally even if Firestore fails
      try {
        await AsyncStorage.setItem(PUSH_PROMPT_STORAGE_KEY, userId);
      } catch {
        // Silent fail - best effort
      }
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
