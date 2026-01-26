/**
 * useOnboarding Hook
 * Easy integration for onboarding tracking throughout the app
 */

import { useEffect, useCallback, useRef } from "react";
import { AppState, AppStateStatus } from "react-native";
import { auth } from "../config/firebase";
import {
  initializeUserOnboarding,
  trackUserActivity,
  trackTripCreated,
  trackPackingListGenerated,
  trackGearItemAdded,
  trackPlaceSaved,
  trackWeatherAddedToTrip,
  trackBuddyInvited,
  trackMealPlanAdded,
  trackCustomPackingListSaved,
  trackCampingStyleSet,
  trackCommunityPost,
  getOnboardingStatus,
  getOnboardingDay,
  isCampaignActive,
} from "../services/onboardingTrackingService";
import { UserOnboarding } from "../types/notifications";

export interface UseOnboardingResult {
  // Track specific actions
  trackTripCreated: () => Promise<void>;
  trackPackingListGenerated: () => Promise<void>;
  trackGearItemAdded: () => Promise<void>;
  trackPlaceSaved: () => Promise<void>;
  trackWeatherAddedToTrip: () => Promise<void>;
  trackBuddyInvited: () => Promise<void>;
  trackMealPlanAdded: () => Promise<void>;
  trackCustomPackingListSaved: () => Promise<void>;
  trackCampingStyleSet: () => Promise<void>;
  trackCommunityPost: () => Promise<void>;
  // Query status
  getStatus: () => Promise<UserOnboarding | null>;
  getDay: () => Promise<number>;
  isActive: () => Promise<boolean>;
}

/**
 * Hook for onboarding tracking
 * Automatically tracks user activity on app open
 */
export function useOnboarding(): UseOnboardingResult {
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    // Initialize onboarding when user signs in
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          await initializeUserOnboarding(user.uid);
          await trackUserActivity();
        } catch (error) {
          console.error("[useOnboarding] Init error:", error);
        }
      }
    });

    // Track activity when app comes to foreground
    const subscription = AppState.addEventListener("change", handleAppStateChange);

    return () => {
      unsubscribe();
      subscription.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAppStateChange = useCallback(async (nextAppState: AppStateStatus) => {
    if (appState.current.match(/inactive|background/) && nextAppState === "active") {
      // App came to foreground
      if (auth.currentUser) {
        try {
          await trackUserActivity();
        } catch (error) {
          console.error("[useOnboarding] Activity tracking error:", error);
        }
      }
    }
    appState.current = nextAppState;
  }, []);

  return {
    trackTripCreated,
    trackPackingListGenerated,
    trackGearItemAdded,
    trackPlaceSaved,
    trackWeatherAddedToTrip,
    trackBuddyInvited,
    trackMealPlanAdded,
    trackCustomPackingListSaved,
    trackCampingStyleSet,
    trackCommunityPost,
    getStatus: getOnboardingStatus,
    getDay: getOnboardingDay,
    isActive: isCampaignActive,
  };
}

// ============================================
// CONVENIENCE WRAPPERS
// ============================================

/**
 * Wrapper that tracks an action and returns a modified callback
 * Usage: const handleSave = withTracking(trackGearItemAdded, originalSaveHandler)
 */
export function withTracking<T extends (...args: any[]) => Promise<any>>(
  trackFn: () => Promise<void>,
  callback: T
): T {
  return (async (...args: Parameters<T>) => {
    const result = await callback(...args);
    try {
      await trackFn();
    } catch (error) {
      console.error("[withTracking] Error:", error);
    }
    return result;
  }) as T;
}
