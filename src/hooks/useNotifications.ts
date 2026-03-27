/**
 * useNotifications Hook
 * Handles notification setup, listeners, and navigation
 */

import { useEffect, useRef, useCallback } from "react";
import * as Notifications from "expo-notifications";
import { auth } from "../config/firebase";
import {
  registerPushToken,
  addNotificationReceivedListener,
  addNotificationResponseListener,
  getInitialNotification,
  clearBadge,
} from "../services/notificationService";

type NotificationData = {
  type?: string;
  tripId?: string;
  parkId?: string;
  contentId?: string;
  [key: string]: any;
};

// Navigation function type that can be passed in
type NavigateFunction = (screen: string, params?: Record<string, any>) => void;

// Map URL-scheme deep link paths to React Navigation screen names
const DEEP_LINK_PATH_MAP: Record<string, string> = {
  trips: "HomeTabs",
  plan: "HomeTabs",
  home: "HomeTabs",
  learn: "HomeTabs",
  connect: "HomeTabs",
  paywall: "Paywall",
  settings: "Settings",
  account: "Account",
  notifications: "Notifications",
};

/**
 * Resolve a deep link value to a screen name.
 * Handles both plain screen names ("HomeTabs") and URL-scheme links ("tentandlantern://trips").
 */
function resolveDeepLink(deepLink: string): { screen: string; params?: Record<string, any> } | null {
  // Strip URL scheme prefix if present (e.g. "tentandlantern://trips" → "trips")
  const stripped = deepLink.replace(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//, "").replace(/^\/+/, "").replace(/\/+$/, "");
  const pathKey = stripped.toLowerCase();

  // Check explicit path mapping first
  if (DEEP_LINK_PATH_MAP[pathKey]) {
    return { screen: DEEP_LINK_PATH_MAP[pathKey] };
  }

  // If original value looks like a URL scheme, fall back to HomeTabs
  if (deepLink.includes("://")) {
    return { screen: "HomeTabs" };
  }

  // Plain screen name — pass through as-is
  return { screen: deepLink };
}

/**
 * Hook to manage notification listeners and handle notification responses
 * Should be used in the root App component
 */
export function useNotificationListeners(
  navigateFn?: NavigateFunction
) {
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  const handleNotificationResponse = useCallback((
    response: Notifications.NotificationResponse
  ) => {
    const data = response.notification.request.content.data as NotificationData;

    if (!navigateFn) {
      return;
    }

    // If no type, check for deepLink before bailing
    if (!data?.type) {
      if (data?.deepLink && typeof data.deepLink === "string" && data.deepLink.length > 0) {
        try {
          const resolved = resolveDeepLink(data.deepLink);
          if (resolved) {
            navigateFn(resolved.screen, resolved.params);
          }
        } catch (navErr) {
          console.log("[Notifications] deepLink navigation failed:", navErr);
        }
      }
      return;
    }

    // Navigate based on notification type
    switch (data.type) {
      // Client-originated trip types
      case "trip_reminder":
      case "packing_reminder":
      case "arrival_day":
      case "trip_ending":
      case "post_trip_recap":
      // Server-queued trip types
      case "trip_starts_3_days":
      case "trip_starts_tomorrow":
      case "trip_no_packing_list_24h":
        if (data.tripId) {
          navigateFn("TripDetail", { tripId: data.tripId });
        } else {
          // No tripId in payload — fall back to Plan tab
          navigateFn("HomeTabs", { screen: "Plan" });
        }
        break;

      case "weather_alert":
        if (data.tripId) {
          navigateFn("PlanTab", { 
            screen: "Weather",
            params: { tripId: data.tripId }
          });
        }
        break;

      case "park_advisory":
        if (data.parkId) {
          navigateFn("ParkDetail", { parkId: data.parkId });
        }
        break;

      case "community_answer":
      case "community_reply":
        if (data.contentId) {
          navigateFn("CommunityStack", {
            screen: "ContentDetail",
            params: { contentId: data.contentId }
          });
        }
        break;

      case "community_upvote":
      case "community_featured":
        navigateFn("CommunityTab");
        break;

      case "subscription":
      case "payment_issue":
        navigateFn("ManageSubscription");
        break;

      case "badge_earned":
      case "module_progress":
        navigateFn("LearnTab");
        break;

      default:
        // Handle onboarding_day_* and inactive_* types → route to Home
        if (data.type?.startsWith("onboarding_day_") || data.type?.startsWith("inactive_")) {
          navigateFn("HomeTabs");
          break;
        }
        // If there's a deepLink in the payload, try to navigate to it
        if (data.deepLink) {
          const resolved = resolveDeepLink(data.deepLink as string);
          if (resolved) {
            navigateFn(resolved.screen, resolved.params);
          }
          break;
        }
        console.log("[Notifications] Unhandled notification type:", data.type);
    }
  }, [navigateFn]);

  const checkInitialNotification = useCallback(async () => {
    const response = await getInitialNotification();
    if (response) {
      console.log("[Notifications] App launched from notification:", response);
      handleNotificationResponse(response);
    }
  }, [handleNotificationResponse]);

  useEffect(() => {
    // Register push token when user is authenticated
    const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
      if (user) {
        await registerPushToken(user.uid);
      }
    });

    // Check for initial notification (app was launched from notification)
    checkInitialNotification();

    // Listen for notifications received while app is foregrounded
    notificationListener.current = addNotificationReceivedListener((notification) => {
      console.log("[Notifications] Received in foreground:", notification);
      // Could show an in-app notification banner here
    });

    // Listen for notification responses (user tapped notification)
    responseListener.current = addNotificationResponseListener((response) => {
      console.log("[Notifications] User tapped:", response);
      handleNotificationResponse(response);
    });

    // Clear badge when app is opened
    clearBadge();

    return () => {
      unsubscribeAuth();
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [checkInitialNotification, handleNotificationResponse]);
}

/**
 * Hook to request notification permissions on first launch or when needed
 */
export function useNotificationPermission() {
  useEffect(() => {
    // Could be used to show a permission priming screen
    // or request permissions at an appropriate time
  }, []);
}
