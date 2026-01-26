/**
 * Notification Preferences Service
 * Handles push permission requests, token management, and preference updates
 */

import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { auth, db } from "../config/firebase";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import Constants from "expo-constants";
import type {
  NotificationPermissionStatus,
  PushEligibilityResult,
  EmailEligibilityResult,
} from "../types/userPreferences";

// ============================================
// PUSH NOTIFICATION PERMISSION
// ============================================

/**
 * Request push notification permission from OS
 * Returns the permission status after request
 */
export async function requestPushPermission(): Promise<NotificationPermissionStatus> {
  // Check if physical device (push doesn't work on simulators)
  if (!Device.isDevice) {
    console.log("[NotificationPrefs] Not a physical device, skipping push setup");
    return "denied";
  }

  try {
    // Check existing permission
    const { status: existingStatus } = await Notifications.getPermissionsAsync();

    if (existingStatus === "granted") {
      return "granted";
    }

    // Request permission
    const { status } = await Notifications.requestPermissionsAsync();

    // Map Expo status to our type
    if (status === "granted") {
      return "granted";
    } else if (status === "denied") {
      return "denied";
    }

    return "unknown";
  } catch (error) {
    console.error("[NotificationPrefs] Error requesting permission:", error);
    return "unknown";
  }
}

/**
 * Get current push permission status without prompting
 */
export async function getPushPermissionStatus(): Promise<NotificationPermissionStatus> {
  try {
    const { status } = await Notifications.getPermissionsAsync();

    if (status === "granted") {
      return "granted";
    } else if (status === "denied") {
      return "denied";
    }

    return "unknown";
  } catch (error) {
    console.error("[NotificationPrefs] Error getting permission status:", error);
    return "unknown";
  }
}

/**
 * Register for push notifications and save token to Firestore
 * Should only be called after permission is granted
 */
export async function registerPushToken(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) {
    console.log("[NotificationPrefs] No user, skipping token registration");
    return null;
  }

  if (!Device.isDevice) {
    console.log("[NotificationPrefs] Not a physical device, skipping token registration");
    return null;
  }

  try {
    // Get Expo push token
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });

    const token = tokenData.data;

    // Save token to Firestore
    const pushTokenRef = doc(db, "pushTokens", `${user.uid}_${Platform.OS}`);
    await setDoc(pushTokenRef, {
      userId: user.uid,
      token,
      platform: Platform.OS,
      deviceName: Device.deviceName || "Unknown",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      disabled: false,
    });

    console.log("[NotificationPrefs] Push token registered:", token.slice(0, 20) + "...");
    return token;
  } catch (error) {
    console.error("[NotificationPrefs] Error registering push token:", error);
    return null;
  }
}

/**
 * Disable push token (when user opts out)
 */
export async function disablePushToken(): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;

  try {
    const pushTokenRef = doc(db, "pushTokens", `${user.uid}_${Platform.OS}`);
    await updateDoc(pushTokenRef, {
      disabled: true,
      updatedAt: serverTimestamp(),
    });
    console.log("[NotificationPrefs] Push token disabled");
  } catch {
    // Token might not exist, which is fine
    console.log("[NotificationPrefs] No push token to disable");
  }
}

// ============================================
// USER PREFERENCE UPDATES
// ============================================

/**
 * Update push notification preference
 * Handles OS permission request if enabling
 */
export async function updatePushPreference(enabled: boolean): Promise<{
  success: boolean;
  permissionStatus: NotificationPermissionStatus;
  message?: string;
}> {
  const user = auth.currentUser;
  if (!user) {
    return { success: false, permissionStatus: "unknown", message: "Not authenticated" };
  }

  try {
    if (enabled) {
      // User wants to enable - request OS permission
      const permissionStatus = await requestPushPermission();

      if (permissionStatus === "granted") {
        // Permission granted - register token and update preferences
        await registerPushToken();

        await updateDoc(doc(db, "users", user.uid), {
          notificationsEnabled: true,
          notificationPermissionStatus: "granted",
          updatedAt: serverTimestamp(),
        });

        return { success: true, permissionStatus: "granted" };
      } else {
        // Permission denied - update status but keep preference as user's intent
        await updateDoc(doc(db, "users", user.uid), {
          notificationsEnabled: true, // User wants notifications
          notificationPermissionStatus: permissionStatus, // But OS denied
          updatedAt: serverTimestamp(),
        });

        return {
          success: false,
          permissionStatus,
          message:
            "To enable notifications, please go to your device Settings and allow notifications for this app.",
        };
      }
    } else {
      // User wants to disable - update preference and disable token
      await disablePushToken();

      await updateDoc(doc(db, "users", user.uid), {
        notificationsEnabled: false,
        updatedAt: serverTimestamp(),
      });

      return { success: true, permissionStatus: "denied" };
    }
  } catch (error: any) {
    console.error("[NotificationPrefs] Error updating push preference:", error);
    return { success: false, permissionStatus: "unknown", message: error.message };
  }
}

/**
 * Update email marketing preference
 */
export async function updateEmailMarketingPreference(enabled: boolean): Promise<boolean> {
  const user = auth.currentUser;
  if (!user || !user.email) return false;

  try {
    // Update users document
    await updateDoc(doc(db, "users", user.uid), {
      emailMarketingEnabled: enabled,
      updatedAt: serverTimestamp(),
    });

    // Update emailSubscribers document
    const emailSubRef = doc(db, "emailSubscribers", user.uid);
    await setDoc(
      emailSubRef,
      {
        email: user.email,
        userId: user.uid,
        unsubscribed: !enabled,
        marketingUnsubscribed: !enabled,
        updatedAt: serverTimestamp(),
        ...(enabled ? {} : { unsubscribedAt: serverTimestamp() }),
      },
      { merge: true }
    );

    console.log("[NotificationPrefs] Email marketing preference updated:", enabled);
    return true;
  } catch (error) {
    console.error("[NotificationPrefs] Error updating email marketing preference:", error);
    return false;
  }
}

/**
 * Update transactional email preference
 * Note: Transactional emails (invites, account notices) should generally stay enabled
 */
export async function updateEmailTransactionalPreference(enabled: boolean): Promise<boolean> {
  const user = auth.currentUser;
  if (!user) return false;

  try {
    await updateDoc(doc(db, "users", user.uid), {
      emailTransactionalEnabled: enabled,
      updatedAt: serverTimestamp(),
    });

    console.log("[NotificationPrefs] Email transactional preference updated:", enabled);
    return true;
  } catch (error) {
    console.error("[NotificationPrefs] Error updating email transactional preference:", error);
    return false;
  }
}

// ============================================
// ELIGIBILITY CHECKS
// ============================================

/**
 * Check if user is eligible to receive push notifications
 */
export async function checkPushEligibility(userId: string): Promise<PushEligibilityResult> {
  try {
    const userDoc = await getDoc(doc(db, "users", userId));
    if (!userDoc.exists()) {
      return { eligible: false, reason: "user_not_found" };
    }

    const userData = userDoc.data();

    // Check if notifications are enabled in app
    if (userData.notificationsEnabled === false) {
      return { eligible: false, reason: "notifications_disabled" };
    }

    // Check OS permission status
    if (userData.notificationPermissionStatus !== "granted") {
      return { eligible: false, reason: "permission_not_granted" };
    }

    // Check if user has a push token
    const tokensSnapshot = await getDocs(
      query(collection(db, "pushTokens"), where("userId", "==", userId), where("disabled", "!=", true))
    );

    if (tokensSnapshot.empty) {
      return { eligible: false, reason: "no_push_token" };
    }

    return { eligible: true };
  } catch (error) {
    console.error("[NotificationPrefs] Error checking push eligibility:", error);
    return { eligible: false, reason: "error" };
  }
}

/**
 * Check if user is eligible to receive marketing emails
 */
export async function checkEmailMarketingEligibility(userId: string): Promise<EmailEligibilityResult> {
  try {
    const userDoc = await getDoc(doc(db, "users", userId));
    if (!userDoc.exists()) {
      return { eligible: false, reason: "user_not_found", isTransactional: false };
    }

    const userData = userDoc.data();

    // Check if marketing emails are enabled
    if (userData.emailMarketingEnabled === false) {
      return { eligible: false, reason: "marketing_disabled", isTransactional: false };
    }

    // Check emailSubscribers for unsubscribe status
    const emailSubRef = doc(db, "emailSubscribers", userId);
    const emailSubDoc = await getDoc(emailSubRef);

    if (emailSubDoc.exists()) {
      const emailData = emailSubDoc.data();
      if (emailData.unsubscribed || emailData.marketingUnsubscribed) {
        return { eligible: false, reason: "unsubscribed", isTransactional: false };
      }
    }

    return { eligible: true, isTransactional: false };
  } catch (error) {
    console.error("[NotificationPrefs] Error checking email marketing eligibility:", error);
    return { eligible: false, reason: "error", isTransactional: false };
  }
}

/**
 * Check if user is eligible to receive transactional emails
 * Transactional emails have fewer restrictions
 */
export async function checkEmailTransactionalEligibility(userId: string): Promise<EmailEligibilityResult> {
  try {
    const userDoc = await getDoc(doc(db, "users", userId));
    if (!userDoc.exists()) {
      return { eligible: false, reason: "user_not_found", isTransactional: true };
    }

    const userData = userDoc.data();

    // Transactional emails can be disabled by user
    if (userData.emailTransactionalEnabled === false) {
      return { eligible: false, reason: "transactional_disabled", isTransactional: true };
    }

    // Note: We don't check SendGrid unsubscribe for transactional emails
    // as they are legally allowed even if user unsubscribed from marketing

    return { eligible: true, isTransactional: true };
  } catch (error) {
    console.error("[NotificationPrefs] Error checking email transactional eligibility:", error);
    return { eligible: false, reason: "error", isTransactional: true };
  }
}

// ============================================
// INITIALIZATION
// ============================================

/**
 * Initialize user preferences on signup/first login
 * Sets default values for new users
 */
export async function initializeUserPreferences(userId: string, email?: string): Promise<void> {
  try {
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      const data = userDoc.data();

      // Only set defaults for fields that don't exist
      const updates: Record<string, any> = {};

      if (data.notificationsEnabled === undefined) {
        updates.notificationsEnabled = true;
      }
      if (data.notificationPermissionStatus === undefined) {
        updates.notificationPermissionStatus = "unknown";
      }
      if (data.emailTransactionalEnabled === undefined) {
        updates.emailTransactionalEnabled = true;
      }
      if (data.emailMarketingEnabled === undefined) {
        updates.emailMarketingEnabled = true;
      }
      if (data.emailConsentRegion === undefined) {
        updates.emailConsentRegion = "unknown";
      }

      // Initialize onboarding if not present
      if (!data.onboarding) {
        updates.onboarding = {
          startedAt: serverTimestamp(),
          lastActiveAt: serverTimestamp(),
          pushesThisWeek: 0,
          emailsThisWeek: 0,
          completedActions: {},
          counters: {},
        };
      }

      if (Object.keys(updates).length > 0) {
        updates.updatedAt = serverTimestamp();
        await updateDoc(userRef, updates);
        console.log("[NotificationPrefs] Initialized user preferences:", Object.keys(updates));
      }
    }

    // Initialize email subscriber document
    if (email) {
      const emailSubRef = doc(db, "emailSubscribers", userId);
      const emailSubDoc = await getDoc(emailSubRef);

      if (!emailSubDoc.exists()) {
        await setDoc(emailSubRef, {
          email,
          userId,
          unsubscribed: false,
          marketingUnsubscribed: false,
          source: "signup",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        console.log("[NotificationPrefs] Created email subscriber document");
      }
    }
  } catch (error) {
    console.error("[NotificationPrefs] Error initializing user preferences:", error);
  }
}

/**
 * Sync OS permission status to Firestore
 * Should be called on app foreground
 */
export async function syncPermissionStatus(): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;

  try {
    const permissionStatus = await getPushPermissionStatus();

    await updateDoc(doc(db, "users", user.uid), {
      notificationPermissionStatus: permissionStatus,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("[NotificationPrefs] Error syncing permission status:", error);
  }
}
