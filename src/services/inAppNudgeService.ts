/**
 * In-App Nudge Service
 * Shows contextual banners for users who have push disabled
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db, auth } from "../config/firebase";
import {
  ONBOARDING_SCHEDULE,
  OnboardingMessage,
  EVENT_TRIGGERS,
  NotificationType,
  UserOnboarding,
  NOTIFICATION_CONFIG,
} from "../types/notifications";

const NUDGE_STORAGE_KEY = "@nudge_dismissed";
const NUDGE_SHOWN_TODAY_KEY = "@nudge_shown_today";

export interface InAppNudge {
  type: NotificationType;
  title: string;
  body: string;
  deepLink: string;
  dismissable: boolean;
  priority: "high" | "medium" | "low";
}

// ============================================
// GET CURRENT NUDGE TO SHOW
// ============================================

/**
 * Get the appropriate nudge to show for the current user
 * Returns null if no nudge should be shown
 */
export async function getCurrentNudge(): Promise<InAppNudge | null> {
  const user = auth.currentUser;
  if (!user) return null;

  try {
    // Check if we already showed a nudge today
    const shownToday = await AsyncStorage.getItem(NUDGE_SHOWN_TODAY_KEY);
    const today = new Date().toDateString();
    if (shownToday === today) {
      return null;
    }

    // Get user onboarding status
    const userRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) return null;

    const onboarding = userDoc.data()?.onboarding as UserOnboarding | undefined;
    
    // Don't show if campaign is completed
    if (onboarding?.campaignCompleted) {
      return await getReengagementNudge(onboarding);
    }

    // Calculate onboarding day
    const startedAt = onboarding?.startedAt as any;
    if (!startedAt?.toDate) return null;

    const daysSinceStart = Math.floor(
      (Date.now() - startedAt.toDate().getTime()) / (1000 * 60 * 60 * 24)
    );
    const currentDay = daysSinceStart + 1;

    // Find the appropriate message for today
    const message = findMessageForDay(currentDay, onboarding);
    if (!message) return null;

    // Check if already dismissed
    const dismissed = await getDismissedNudges();
    if (dismissed.includes(message.type)) {
      return null;
    }

    return {
      type: message.type,
      title: message.title,
      body: message.body,
      deepLink: message.deepLink,
      dismissable: true,
      priority: currentDay <= 7 ? "high" : "medium",
    };
  } catch (error) {
    console.error("[InAppNudge] Error getting nudge:", error);
    return null;
  }
}

/**
 * Find the best message for the current day
 */
function findMessageForDay(
  currentDay: number,
  onboarding?: UserOnboarding
): OnboardingMessage | null {
  // Find messages for today or earlier that haven't been completed
  const eligibleMessages = ONBOARDING_SCHEDULE.filter((msg) => {
    // Must be on or before current day
    if (msg.day > currentDay) return false;

    // Check if action is already completed
    if (msg.suppressIfCompleted && onboarding?.completedActions) {
      const actionKey = msg.suppressIfCompleted as keyof typeof onboarding.completedActions;
      if (onboarding.completedActions[actionKey]) {
        return false;
      }
    }

    return true;
  });

  // Return the most recent eligible message
  return eligibleMessages.length > 0
    ? eligibleMessages[eligibleMessages.length - 1]
    : null;
}

/**
 * Get re-engagement nudge for inactive users
 */
async function getReengagementNudge(onboarding: UserOnboarding): Promise<InAppNudge | null> {
  const lastActiveAt = onboarding.lastActiveAt as any;
  if (!lastActiveAt?.toDate) return null;

  const daysSinceActive = Math.floor(
    (Date.now() - lastActiveAt.toDate().getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysSinceActive >= NOTIFICATION_CONFIG.inactivityThresholdDays) {
    const trigger = EVENT_TRIGGERS.inactive_30_days;
    return {
      type: trigger.type,
      title: trigger.title,
      body: trigger.body,
      deepLink: trigger.deepLink,
      dismissable: true,
      priority: "high",
    };
  }

  return null;
}

// ============================================
// EVENT-BASED NUDGES
// ============================================

/**
 * Get nudge for a specific event (gear added, place saved, etc.)
 */
export function getEventNudge(eventKey: keyof typeof EVENT_TRIGGERS): InAppNudge | null {
  const trigger = EVENT_TRIGGERS[eventKey];
  if (!trigger || !trigger.inAppOnly) return null;

  return {
    type: trigger.type,
    title: trigger.title,
    body: trigger.body,
    deepLink: trigger.deepLink,
    dismissable: true,
    priority: "low",
  };
}

// ============================================
// DISMISS TRACKING
// ============================================

/**
 * Mark a nudge as dismissed
 */
export async function dismissNudge(type: NotificationType): Promise<void> {
  try {
    const dismissed = await getDismissedNudges();
    if (!dismissed.includes(type)) {
      dismissed.push(type);
      await AsyncStorage.setItem(NUDGE_STORAGE_KEY, JSON.stringify(dismissed));
    }

    // Mark that we showed a nudge today
    await AsyncStorage.setItem(NUDGE_SHOWN_TODAY_KEY, new Date().toDateString());
  } catch (error) {
    console.error("[InAppNudge] Error dismissing nudge:", error);
  }
}

/**
 * Get list of dismissed nudge types
 */
async function getDismissedNudges(): Promise<NotificationType[]> {
  try {
    const data = await AsyncStorage.getItem(NUDGE_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

/**
 * Clear all dismissed nudges (for testing)
 */
export async function clearDismissedNudges(): Promise<void> {
  await AsyncStorage.removeItem(NUDGE_STORAGE_KEY);
  await AsyncStorage.removeItem(NUDGE_SHOWN_TODAY_KEY);
}

// ============================================
// UPDATE LAST NUDGE KEY
// ============================================

/**
 * Record which nudge was shown
 */
export async function recordNudgeShown(type: NotificationType): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;

  try {
    const userRef = doc(db, "users", user.uid);
    await updateDoc(userRef, {
      "onboarding.lastNudgeKey": type,
    });
  } catch (error) {
    console.error("[InAppNudge] Error recording nudge:", error);
  }
}
