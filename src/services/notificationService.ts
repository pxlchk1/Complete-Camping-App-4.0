/**
 * Notification Service
 * Handles push notifications, local notifications, and scheduling
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
  collection, 
  query, 
  where, 
  getDocs, 
  deleteDoc, 
  serverTimestamp,
} from "firebase/firestore";
import Constants from "expo-constants";

// ==================== Types ====================

export interface NotificationPreferences {
  // Master toggle
  enabled: boolean;
  
  // Trip & Planning
  tripReminders: boolean;           // Trip starts tomorrow, 3 days out
  leaveTimeReminders: boolean;      // Based on drive time
  arrivalDayNudge: boolean;         // "You're arriving today"
  tripEndingReminder: boolean;      // Trip is ending today
  postTripRecap: boolean;           // 1 day after trip
  
  // Packing
  packingListReminders: boolean;    // Not started, incomplete
  essentialsMissing: boolean;       // Key categories empty
  sharedPackingUpdates: boolean;    // Someone updates shared list
  restockReminders: boolean;        // After trip consumables
  
  // Weather & Safety
  weatherAlerts: boolean;           // Rain, wind, extreme temps
  severeWeatherWarnings: boolean;   // Storms, tornado, lightning
  freezeWarnings: boolean;          // Overnight low threshold
  fireWeatherAlerts: boolean;       // Burn bans
  airQualityAlerts: boolean;        // Smoke, poor AQI
  
  // Parks & Discovery
  parkAdvisories: boolean;          // Closures for favorites
  seasonalSuggestions: boolean;     // Best time to visit
  nearbyParkSuggestions: boolean;   // Location-based (opt-in)
  
  // Community
  questionAnswers: boolean;         // Someone answered your question
  commentReplies: boolean;          // Reply to your comment
  tipEngagement: boolean;           // Featured, upvoted, helpful
  moderatorMessages: boolean;       // System/mod messages
  campgroundInvites: boolean;       // My Campground connections
  
  // Account
  trialReminders: boolean;          // Trial ending
  subscriptionReminders: boolean;   // Renewal upcoming
  paymentIssues: boolean;           // Failed payment
  featureAnnouncements: boolean;    // New Pro features
  
  // Learning
  moduleProgress: boolean;          // Unlocked, completed
  badgeEarned: boolean;             // New badges
  
  // Operational
  permissionReminders: boolean;     // Location/notification off
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  enabled: true,
  
  // Trip & Planning - all on by default (high value)
  tripReminders: true,
  leaveTimeReminders: true,
  arrivalDayNudge: true,
  tripEndingReminder: true,
  postTripRecap: true,
  
  // Packing - all on (high value)
  packingListReminders: true,
  essentialsMissing: true,
  sharedPackingUpdates: true,
  restockReminders: false, // optional
  
  // Weather & Safety - critical ones on
  weatherAlerts: true,
  severeWeatherWarnings: true,
  freezeWarnings: true,
  fireWeatherAlerts: true,
  airQualityAlerts: true,
  
  // Parks & Discovery - conservative defaults
  parkAdvisories: true,
  seasonalSuggestions: false,
  nearbyParkSuggestions: false,
  
  // Community - on by default
  questionAnswers: true,
  commentReplies: true,
  tipEngagement: true,
  moderatorMessages: true,
  campgroundInvites: true,
  
  // Account - important ones on
  trialReminders: true,
  subscriptionReminders: true,
  paymentIssues: true,
  featureAnnouncements: false,
  
  // Learning
  moduleProgress: true,
  badgeEarned: true,
  
  // Operational
  permissionReminders: true,
};

// ==================== Notification Configuration ====================

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ==================== Permission & Token Management ====================

/**
 * Check if notifications are available and get current permission status
 */
export async function getNotificationStatus(): Promise<{
  isDevice: boolean;
  permissionStatus: Notifications.PermissionStatus;
  canAskAgain: boolean;
}> {
  const isDevice = Device.isDevice;
  const { status, canAskAgain } = await Notifications.getPermissionsAsync();
  
  return {
    isDevice,
    permissionStatus: status,
    canAskAgain,
  };
}

/**
 * Request notification permissions
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!Device.isDevice) {
    console.log("[Notifications] Not a physical device, skipping permission request");
    return false;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  
  if (existingStatus === "granted") {
    return true;
  }

  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

/**
 * Get the Expo push token for this device
 */
export async function getExpoPushToken(): Promise<string | null> {
  if (!Device.isDevice) {
    return null;
  }

  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: projectId,
    });
    
    return tokenData.data;
  } catch (error) {
    console.error("[Notifications] Error getting push token:", error);
    return null;
  }
}

/**
 * Register push token with Firestore
 */
export async function registerPushToken(userId: string): Promise<boolean> {
  try {
    const token = await getExpoPushToken();
    
    if (!token) {
      console.log("[Notifications] No token available");
      return false;
    }

    const pushTokensRef = collection(db, "pushTokens");
    const q = query(
      pushTokensRef, 
      where("userId", "==", userId), 
      where("token", "==", token)
    );
    const existingTokens = await getDocs(q);

    if (existingTokens.empty) {
      await setDoc(doc(pushTokensRef), {
        userId,
        token,
        platform: Platform.OS,
        deviceName: Device.deviceName,
        createdAt: serverTimestamp(),
        lastUsed: serverTimestamp(),
      });
      console.log("[Notifications] Registered new push token");
    } else {
      // Update lastUsed timestamp
      const tokenDoc = existingTokens.docs[0];
      await updateDoc(tokenDoc.ref, {
        lastUsed: serverTimestamp(),
      });
    }

    return true;
  } catch (error) {
    console.error("[Notifications] Error registering token:", error);
    return false;
  }
}

/**
 * Unregister push tokens for a user
 */
export async function unregisterPushTokens(userId: string): Promise<void> {
  try {
    const pushTokensRef = collection(db, "pushTokens");
    const q = query(pushTokensRef, where("userId", "==", userId));
    const tokens = await getDocs(q);

    await Promise.all(tokens.docs.map(tokenDoc => deleteDoc(tokenDoc.ref)));
    console.log("[Notifications] Unregistered all push tokens");
  } catch (error) {
    console.error("[Notifications] Error unregistering tokens:", error);
  }
}

// ==================== Preferences Management ====================

/**
 * Get notification preferences for a user
 */
export async function getNotificationPreferences(
  userId: string
): Promise<NotificationPreferences> {
  try {
    const prefsDoc = await getDoc(doc(db, "notificationPreferences", userId));
    
    if (prefsDoc.exists()) {
      return { ...DEFAULT_NOTIFICATION_PREFERENCES, ...prefsDoc.data() } as NotificationPreferences;
    }
    
    return DEFAULT_NOTIFICATION_PREFERENCES;
  } catch (error) {
    console.error("[Notifications] Error loading preferences:", error);
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }
}

/**
 * Save notification preferences for a user
 */
export async function saveNotificationPreferences(
  userId: string,
  preferences: Partial<NotificationPreferences>
): Promise<void> {
  try {
    const prefsRef = doc(db, "notificationPreferences", userId);
    await setDoc(prefsRef, {
      ...preferences,
      updatedAt: serverTimestamp(),
    }, { merge: true });
    
    console.log("[Notifications] Preferences saved");
  } catch (error) {
    console.error("[Notifications] Error saving preferences:", error);
    throw error;
  }
}

// ==================== Local Notification Scheduling ====================

/**
 * Schedule a trip reminder notification
 */
export async function scheduleTripReminder(
  tripId: string,
  tripName: string,
  tripDate: Date,
  daysBeforeTrip: number = 1
): Promise<string | null> {
  try {
    const reminderDate = new Date(tripDate);
    reminderDate.setDate(reminderDate.getDate() - daysBeforeTrip);
    reminderDate.setHours(9, 0, 0, 0); // 9 AM reminder
    
    // Don't schedule if the reminder date is in the past
    if (reminderDate <= new Date()) {
      return null;
    }

    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: daysBeforeTrip === 1 
          ? "🏕️ Your trip starts tomorrow!" 
          : `🏕️ Your trip is in ${daysBeforeTrip} days`,
        body: `${tripName} - Time to finalize your packing list!`,
        data: { type: "trip_reminder", tripId },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: reminderDate,
      },
    });

    console.log(`[Notifications] Scheduled trip reminder: ${identifier}`);
    return identifier;
  } catch (error) {
    console.error("[Notifications] Error scheduling trip reminder:", error);
    return null;
  }
}

/**
 * Schedule a packing list reminder
 */
export async function schedulePackingReminder(
  tripId: string,
  tripName: string,
  tripDate: Date
): Promise<string | null> {
  try {
    const reminderDate = new Date(tripDate);
    reminderDate.setDate(reminderDate.getDate() - 1);
    reminderDate.setHours(18, 0, 0, 0); // 6 PM the day before
    
    if (reminderDate <= new Date()) {
      return null;
    }

    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: "📦 Don't forget to pack!",
        body: `Your trip "${tripName}" starts tomorrow. Check your packing list!`,
        data: { type: "packing_reminder", tripId },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: reminderDate,
      },
    });

    console.log(`[Notifications] Scheduled packing reminder: ${identifier}`);
    return identifier;
  } catch (error) {
    console.error("[Notifications] Error scheduling packing reminder:", error);
    return null;
  }
}

/**
 * Schedule trip arrival day notification
 */
export async function scheduleArrivalDayNotification(
  tripId: string,
  tripName: string,
  tripDate: Date,
  destinationName?: string
): Promise<string | null> {
  try {
    const notificationDate = new Date(tripDate);
    notificationDate.setHours(7, 0, 0, 0); // 7 AM on arrival day
    
    if (notificationDate <= new Date()) {
      return null;
    }

    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: "🌲 You're arriving today!",
        body: destinationName 
          ? `Heading to ${destinationName}. Have a great trip!`
          : `Time to hit the road for "${tripName}"!`,
        data: { type: "arrival_day", tripId },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: notificationDate,
      },
    });

    console.log(`[Notifications] Scheduled arrival notification: ${identifier}`);
    return identifier;
  } catch (error) {
    console.error("[Notifications] Error scheduling arrival notification:", error);
    return null;
  }
}

/**
 * Schedule post-trip recap reminder
 */
export async function schedulePostTripRecap(
  tripId: string,
  tripName: string,
  tripEndDate: Date
): Promise<string | null> {
  try {
    const reminderDate = new Date(tripEndDate);
    reminderDate.setDate(reminderDate.getDate() + 1);
    reminderDate.setHours(10, 0, 0, 0); // 10 AM the day after
    
    if (reminderDate <= new Date()) {
      return null;
    }

    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: "📸 How was your trip?",
        body: `Add photos and notes from "${tripName}" while it's fresh!`,
        data: { type: "post_trip_recap", tripId },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: reminderDate,
      },
    });

    console.log(`[Notifications] Scheduled post-trip recap: ${identifier}`);
    return identifier;
  } catch (error) {
    console.error("[Notifications] Error scheduling post-trip recap:", error);
    return null;
  }
}

/**
 * Cancel all scheduled notifications for a trip
 */
export async function cancelTripNotifications(tripId: string): Promise<void> {
  try {
    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
    
    const tripNotifications = scheduledNotifications.filter(
      (n) => n.content.data?.tripId === tripId
    );

    await Promise.all(
      tripNotifications.map((n) => 
        Notifications.cancelScheduledNotificationAsync(n.identifier)
      )
    );

    console.log(`[Notifications] Cancelled ${tripNotifications.length} notifications for trip ${tripId}`);
  } catch (error) {
    console.error("[Notifications] Error cancelling trip notifications:", error);
  }
}

/**
 * Schedule all notifications for a trip based on user preferences
 */
export async function scheduleAllTripNotifications(
  tripId: string,
  tripName: string,
  startDate: Date,
  endDate: Date,
  destinationName?: string
): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;

  try {
    const preferences = await getNotificationPreferences(user.uid);
    
    if (!preferences.enabled) {
      console.log("[Notifications] Notifications disabled, skipping scheduling");
      return;
    }

    // Cancel any existing notifications for this trip
    await cancelTripNotifications(tripId);

    // Schedule based on preferences
    if (preferences.tripReminders) {
      await scheduleTripReminder(tripId, tripName, startDate, 3); // 3 days before
      await scheduleTripReminder(tripId, tripName, startDate, 1); // 1 day before
    }

    if (preferences.packingListReminders) {
      await schedulePackingReminder(tripId, tripName, startDate);
    }

    if (preferences.arrivalDayNudge) {
      await scheduleArrivalDayNotification(tripId, tripName, startDate, destinationName);
    }

    if (preferences.postTripRecap) {
      await schedulePostTripRecap(tripId, tripName, endDate);
    }

    console.log("[Notifications] All trip notifications scheduled");
  } catch (error) {
    console.error("[Notifications] Error scheduling trip notifications:", error);
  }
}

// ==================== Immediate Notifications ====================

/**
 * Send an immediate local notification (for testing or immediate alerts)
 */
export async function sendLocalNotification(
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<string> {
  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: true,
    },
    trigger: null, // null = immediate
  });

  return identifier;
}

/**
 * Send a weather alert notification
 */
export async function sendWeatherAlert(
  tripName: string,
  alertType: string,
  details: string
): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;

  const preferences = await getNotificationPreferences(user.uid);
  
  if (!preferences.enabled || !preferences.weatherAlerts) {
    return;
  }

  await sendLocalNotification(
    `⚠️ Weather Alert: ${alertType}`,
    `${tripName}: ${details}`,
    { type: "weather_alert" }
  );
}

/**
 * Send a community notification (someone replied, etc.)
 */
export async function sendCommunityNotification(
  type: "answer" | "reply" | "upvote" | "featured",
  contentTitle: string
): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;

  const preferences = await getNotificationPreferences(user.uid);
  
  if (!preferences.enabled) return;

  const messages = {
    answer: {
      title: "💬 New answer to your question",
      body: `Someone answered "${contentTitle}"`,
      prefKey: "questionAnswers" as keyof NotificationPreferences,
    },
    reply: {
      title: "💬 New reply",
      body: `Someone replied to your comment on "${contentTitle}"`,
      prefKey: "commentReplies" as keyof NotificationPreferences,
    },
    upvote: {
      title: "👍 Your tip was helpful!",
      body: `"${contentTitle}" was upvoted`,
      prefKey: "tipEngagement" as keyof NotificationPreferences,
    },
    featured: {
      title: "⭐ Your tip was featured!",
      body: `"${contentTitle}" is now featured`,
      prefKey: "tipEngagement" as keyof NotificationPreferences,
    },
  };

  const message = messages[type];
  
  if (preferences[message.prefKey]) {
    await sendLocalNotification(message.title, message.body, { type: `community_${type}` });
  }
}

// ==================== Notification Listeners ====================

/**
 * Add listener for when a notification is received while app is foregrounded
 */
export function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void
): Notifications.Subscription {
  return Notifications.addNotificationReceivedListener(callback);
}

/**
 * Add listener for when user taps on a notification
 */
export function addNotificationResponseListener(
  callback: (response: Notifications.NotificationResponse) => void
): Notifications.Subscription {
  return Notifications.addNotificationResponseReceivedListener(callback);
}

/**
 * Get the initial notification that launched the app (if any)
 */
export async function getInitialNotification(): Promise<Notifications.NotificationResponse | null> {
  return await Notifications.getLastNotificationResponseAsync();
}

// ==================== Badge Management ====================

/**
 * Set the app badge count
 */
export async function setBadgeCount(count: number): Promise<void> {
  await Notifications.setBadgeCountAsync(count);
}

/**
 * Clear the app badge
 */
export async function clearBadge(): Promise<void> {
  await Notifications.setBadgeCountAsync(0);
}

// ==================== Utility ====================

/**
 * Get all scheduled notifications (for debugging)
 */
export async function getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
  return await Notifications.getAllScheduledNotificationsAsync();
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
