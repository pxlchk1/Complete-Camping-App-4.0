/**
 * Notification Eligibility Service
 * 
 * Determines if a user should see the notification opt-in modal and tracks
 * related analytics events.
 * 
 * ELIGIBILITY RULES:
 * Show modal IF ALL of these are true:
 *   1. Push notifications are NOT already authorized
 *   2. User has NOT already completed this flow
 *   3. User is either:
 *      a. A new user (created after notification feature launch), OR
 *      b. A legacy user from versions without notification access
 * 
 * COHORT TYPES:
 * - new_user: Account created after notification modal feature was available
 * - legacy_no_access: Account created before notification feature was available
 * 
 * PERSISTED STATE (in users collection):
 * - notificationModalShownAt: timestamp
 * - notificationModalDismissedAt: timestamp  
 * - notificationModalCompletedAt: timestamp (when permission granted)
 * - notificationPermissionResult: "granted" | "denied" | null
 * - notificationCohort: "new_user" | "legacy_no_access"
 * - hasSeenStayInLoop: boolean (legacy field, kept for compatibility)
 */

import { doc, getDoc, setDoc, serverTimestamp, increment } from "firebase/firestore";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { db, auth } from "../config/firebase";
import Constants from "expo-constants";

// ============================================
// TYPES
// ============================================

export type NotificationCohort = "new_user" | "legacy_no_access";

export interface NotificationEligibilityState {
  isEligible: boolean;
  cohort: NotificationCohort | null;
  permissionStatus: "granted" | "denied" | "undetermined" | "unknown";
  hasCompletedFlow: boolean;
  loading: boolean;
}

export interface NotificationModalState {
  notificationModalShownAt: Date | null;
  notificationModalDismissedAt: Date | null;
  notificationModalCompletedAt: Date | null;
  notificationPermissionResult: "granted" | "denied" | null;
  notificationCohort: NotificationCohort | null;
  notificationModalDismissalCount: number;
  hasSeenStayInLoop: boolean;
}

// ============================================
// CONSTANTS
// ============================================

/**
 * Date boundary for legacy user detection.
 * Users created before this date are considered "legacy_no_access" cohort.
 * This represents when the notification feature was first deployed.
 */
const LEGACY_CUTOFF_DATE = new Date("2026-03-01T00:00:00Z");

/**
 * App version boundary for legacy detection (alternative method).
 * App versions below this did not have notification access.
 * Reserved for future use if version-based detection is needed.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const LEGACY_APP_VERSION_CUTOFF = "4.0.0";

/**
 * Resurfacing rules for dismissed modals:
 * - Wait 14 days after dismissal before showing again
 * - Maximum of 3 total shows (initial + 2 resurfaces)
 */
const RESURFACE_DELAY_DAYS = 14;
const MAX_MODAL_SHOWS = 3;

// ============================================
// ANALYTICS EVENT NAMES
// ============================================

export const NotificationAnalyticsEvents = {
  MODAL_ELIGIBLE: "notification_modal_eligible",
  MODAL_SHOWN: "notification_modal_shown",
  MODAL_PRIMARY_TAPPED: "notification_modal_primary_tapped",
  MODAL_DISMISSED: "notification_modal_dismissed",
  MODAL_CLOSED: "notification_modal_closed",
  PERMISSION_PROMPT_TRIGGERED: "notification_permission_prompt_triggered",
  PERMISSION_GRANTED: "notification_permission_granted",
  PERMISSION_DENIED: "notification_permission_denied",
} as const;

// ============================================
// CORE FUNCTIONS
// ============================================

/**
 * Check current iOS/device push notification permission status
 */
export async function getNotificationPermissionStatus(): Promise<"granted" | "denied" | "undetermined"> {
  if (!Device.isDevice) {
    return "undetermined"; // Simulator - can't determine
  }

  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status === "granted") return "granted";
    if (status === "denied") return "denied";
    return "undetermined";
  } catch (error) {
    console.error("[NotificationEligibility] Error checking permission:", error);
    return "undetermined";
  }
}

/**
 * Get the user's notification modal state from Firestore
 */
export async function getNotificationModalState(userId: string): Promise<NotificationModalState | null> {
  try {
    const userRef = doc(db, "users", userId);
    const snapshot = await getDoc(userRef);
    
    if (!snapshot.exists()) {
      return null;
    }

    const data = snapshot.data();
    
    return {
      notificationModalShownAt: data?.notificationModalShownAt?.toDate?.() || null,
      notificationModalDismissedAt: data?.notificationModalDismissedAt?.toDate?.() || null,
      notificationModalCompletedAt: data?.notificationModalCompletedAt?.toDate?.() || null,
      notificationPermissionResult: data?.notificationPermissionResult || null,
      notificationCohort: data?.notificationCohort || null,
      notificationModalDismissalCount: data?.notificationModalDismissalCount ?? 0,
      hasSeenStayInLoop: data?.hasSeenStayInLoop === true,
    };
  } catch (error) {
    console.error("[NotificationEligibility] Error getting modal state:", error);
    return null;
  }
}

/**
 * Determine user's cohort type based on account creation date
 */
export async function determineUserCohort(userId: string): Promise<NotificationCohort> {
  try {
    const userRef = doc(db, "users", userId);
    const snapshot = await getDoc(userRef);
    
    if (!snapshot.exists()) {
      // No user doc = brand new user
      return "new_user";
    }

    const data = snapshot.data();
    
    // If cohort already set, use it
    if (data?.notificationCohort) {
      return data.notificationCohort as NotificationCohort;
    }

    // Determine based on account creation date
    const createdAt = data?.createdAt;
    let creationDate: Date | null = null;

    if (createdAt) {
      if (typeof createdAt === "string") {
        creationDate = new Date(createdAt);
      } else if (createdAt.toDate) {
        creationDate = createdAt.toDate();
      }
    }

    // If no creation date, check Firebase Auth metadata
    if (!creationDate && auth.currentUser?.metadata?.creationTime) {
      creationDate = new Date(auth.currentUser.metadata.creationTime);
    }

    // If we have a creation date, compare to cutoff
    if (creationDate && creationDate < LEGACY_CUTOFF_DATE) {
      return "legacy_no_access";
    }

    // Default to new user if we can't determine
    return "new_user";
  } catch (error) {
    console.error("[NotificationEligibility] Error determining cohort:", error);
    return "new_user"; // Safe default
  }
}

/**
 * Main eligibility check - determines if user should see notification modal
 */
export async function checkNotificationModalEligibility(userId: string): Promise<NotificationEligibilityState> {
  const baseState: NotificationEligibilityState = {
    isEligible: false,
    cohort: null,
    permissionStatus: "unknown",
    hasCompletedFlow: false,
    loading: false,
  };

  try {
    // 1. Check device push permission status
    const permissionStatus = await getNotificationPermissionStatus();
    baseState.permissionStatus = permissionStatus;

    // If already granted, not eligible (no need to show modal)
    if (permissionStatus === "granted") {
      baseState.hasCompletedFlow = true;
      return baseState;
    }

    // 2. Get user's modal state from Firestore
    const modalState = await getNotificationModalState(userId);

    // 3. If user already completed the flow with GRANTED permission, never show again
    if (modalState?.notificationModalCompletedAt && modalState?.notificationPermissionResult === "granted") {
      baseState.hasCompletedFlow = true;
      return baseState;
    }

    // 4. Determine cohort
    const cohort = await determineUserCohort(userId);
    baseState.cohort = cohort;

    // 5. Check resurfacing rules for previously dismissed modals OR denied via CTA
    //    Both dismissedAt and completedAt with denied result count as dismissals
    const lastDismissalDate = modalState?.notificationModalDismissedAt || 
      (modalState?.notificationPermissionResult === "denied" ? modalState?.notificationModalCompletedAt : null);
    
    if (lastDismissalDate) {
      const dismissalCount = modalState?.notificationModalDismissalCount || 1;
      
      // If shown MAX_MODAL_SHOWS times (3), stop showing
      if (dismissalCount >= MAX_MODAL_SHOWS) {
        console.log("[NotificationEligibility] Max modal shows reached:", dismissalCount);
        return baseState;
      }

      // Check if 14 days have passed since last dismissal
      const now = new Date();
      const daysSinceDismissal = Math.floor(
        (now.getTime() - lastDismissalDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysSinceDismissal < RESURFACE_DELAY_DAYS) {
        console.log("[NotificationEligibility] Resurface delay not met:", {
          daysSinceDismissal,
          required: RESURFACE_DELAY_DAYS,
        });
        return baseState;
      }

      console.log("[NotificationEligibility] Resurfacing modal:", {
        dismissalCount,
        daysSinceDismissal,
      });
    }

    // 6. User is eligible if:
    //    - Permission not granted
    //    - Not already completed flow
    //    - Either first time OR resurface conditions met
    baseState.isEligible = true;

    return baseState;
  } catch (error) {
    console.error("[NotificationEligibility] Error checking eligibility:", error);
    return baseState;
  }
}

// ============================================
// STATE PERSISTENCE FUNCTIONS
// ============================================

/**
 * Record that the modal was shown to user
 */
export async function recordModalShown(userId: string, cohort: NotificationCohort): Promise<void> {
  try {
    const userRef = doc(db, "users", userId);
    await setDoc(userRef, {
      notificationModalShownAt: serverTimestamp(),
      notificationCohort: cohort,
    }, { merge: true });

    console.log("[NotificationEligibility] Modal shown recorded:", { userId, cohort });
  } catch (error) {
    console.error("[NotificationEligibility] Error recording modal shown:", error);
  }
}

/**
 * Record that user dismissed modal with "Not now"
 * Increments dismissal count for resurfacing logic
 */
export async function recordModalDismissed(userId: string): Promise<void> {
  try {
    const userRef = doc(db, "users", userId);
    await setDoc(userRef, {
      notificationModalDismissedAt: serverTimestamp(),
      notificationModalDismissalCount: increment(1),
      hasSeenStayInLoop: true, // Legacy compatibility
    }, { merge: true });

    console.log("[NotificationEligibility] Modal dismissed recorded:", { userId });
  } catch (error) {
    console.error("[NotificationEligibility] Error recording modal dismissed:", error);
  }
}

/**
 * Record that user completed the flow (tapped primary CTA and got a result)
 */
export async function recordModalCompleted(
  userId: string, 
  permissionResult: "granted" | "denied"
): Promise<void> {
  try {
    const userRef = doc(db, "users", userId);
    await setDoc(userRef, {
      notificationModalCompletedAt: serverTimestamp(),
      notificationPermissionResult: permissionResult,
      notificationsEnabled: permissionResult === "granted",
      hasSeenStayInLoop: true, // Legacy compatibility
      consentUpdatedAt: serverTimestamp(),
    }, { merge: true });

    console.log("[NotificationEligibility] Modal completed recorded:", { 
      userId, 
      permissionResult 
    });
  } catch (error) {
    console.error("[NotificationEligibility] Error recording modal completed:", error);
  }
}

// ============================================
// ANALYTICS FUNCTIONS
// ============================================

/**
 * Get common analytics properties
 */
function getCommonAnalyticsProps(cohort: NotificationCohort | null) {
  return {
    userId: auth.currentUser?.uid || "unknown",
    cohort: cohort || "unknown",
    appVersion: Constants.expoConfig?.version || "unknown",
    platform: Platform.OS,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Track notification modal analytics event
 */
export function trackNotificationAnalytics(
  eventName: string,
  cohort: NotificationCohort | null,
  additionalProps?: Record<string, any>
): void {
  const props = {
    ...getCommonAnalyticsProps(cohort),
    ...additionalProps,
  };

  // Log to console in dev (Firebase Analytics doesn't work in RN)
  if (__DEV__) {
    console.log(`[NotificationAnalytics] ${eventName}:`, props);
  }

  // TODO: Replace with @react-native-firebase/analytics when available
  // For now, we log to console and can also write to Firestore for admin reporting
  logAnalyticsToFirestore(eventName, props).catch((err) => {
    console.warn("[NotificationAnalytics] Failed to log to Firestore:", err);
  });
}

/**
 * Log analytics event to Firestore for admin reporting
 */
async function logAnalyticsToFirestore(
  eventName: string, 
  props: Record<string, any>
): Promise<void> {
  try {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    // Store in a subcollection of the user doc for easy querying
    const eventRef = doc(db, "users", userId, "notificationAnalytics", eventName);
    await setDoc(eventRef, {
      ...props,
      eventName,
      createdAt: serverTimestamp(),
    }, { merge: true });
  } catch {
    // Silent fail - analytics should never break the app
  }
}

// ============================================
// CONVENIENCE ANALYTICS HELPERS
// ============================================

export function trackModalEligible(cohort: NotificationCohort): void {
  trackNotificationAnalytics(NotificationAnalyticsEvents.MODAL_ELIGIBLE, cohort);
}

export function trackModalShown(cohort: NotificationCohort): void {
  trackNotificationAnalytics(NotificationAnalyticsEvents.MODAL_SHOWN, cohort);
}

export function trackModalPrimaryTapped(cohort: NotificationCohort): void {
  trackNotificationAnalytics(NotificationAnalyticsEvents.MODAL_PRIMARY_TAPPED, cohort);
}

export function trackModalDismissed(cohort: NotificationCohort | null): void {
  trackNotificationAnalytics(NotificationAnalyticsEvents.MODAL_DISMISSED, cohort);
}

export function trackModalClosed(cohort: NotificationCohort | null): void {
  trackNotificationAnalytics(NotificationAnalyticsEvents.MODAL_CLOSED, cohort);
}

export function trackPermissionPromptTriggered(cohort: NotificationCohort): void {
  trackNotificationAnalytics(NotificationAnalyticsEvents.PERMISSION_PROMPT_TRIGGERED, cohort);
}

export function trackPermissionGranted(cohort: NotificationCohort): void {
  trackNotificationAnalytics(NotificationAnalyticsEvents.PERMISSION_GRANTED, cohort);
}

export function trackPermissionDenied(cohort: NotificationCohort): void {
  trackNotificationAnalytics(NotificationAnalyticsEvents.PERMISSION_DENIED, cohort);
}
