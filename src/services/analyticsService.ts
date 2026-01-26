/**
 * Analytics Service
 * Centralized analytics tracking for activation + retention metrics
 * Uses Firebase Analytics (JS SDK)
 */

import { getAnalytics, logEvent, setUserId, setUserProperties } from "firebase/analytics";
import firebaseApp from "../config/firebase";

// Initialize analytics
const analytics = getAnalytics(firebaseApp);

// ============================================
// CORE EVENT NAMES
// ============================================

export const AnalyticsEvents = {
  // App lifecycle
  APP_OPEN: "app_open",
  
  // Onboarding
  ONBOARDING_STARTED: "onboarding_started",
  ONBOARDING_COMPLETED: "onboarding_completed",
  
  // Push permission
  PERMISSION_PROMPT_SHOWN: "permission_prompt_shown",
  PERMISSION_RESULT: "permission_result",
  
  // Notifications
  PUSH_SENT: "push_sent",
  PUSH_OPENED: "push_opened",
  EMAIL_SENT: "email_sent",
  EMAIL_CLICKED: "email_clicked",
  
  // Core actions
  TRIP_CREATED: "trip_created",
  PACKINGLIST_GENERATED: "packinglist_generated",
  GEAR_ITEM_ADDED: "gear_item_added",
  SAVED_PLACE_ADDED: "saved_place_added",
  WEATHER_ADDED_TO_TRIP: "weather_added_to_trip",
  BUDDY_INVITE_SENT: "buddy_invite_sent",
  
  // Engagement
  RETURN_DAY_7: "return_day_7",
  SESSION_START: "session_start",
  
  // Gating & Monetization
  PAYWALL_SHOWN: "paywall_shown",
  PAYWALL_PRIMARY_CTA_TAPPED: "paywall_primary_cta_tapped",
  PAYWALL_DISMISSED: "paywall_dismissed",
  ACCOUNT_REQUIRED_SHOWN: "account_required_shown",
  ACCOUNT_REQUIRED_CTA_TAPPED: "account_required_cta_tapped",
  ACCOUNT_REQUIRED_DISMISSED: "account_required_dismissed",
  PRO_ATTEMPT_GATE: "pro_attempt_gate",
  
  // Welcome Modals
  MY_CAMPSITE_WELCOME_SHOWN: "my_campsite_welcome_shown",
  MY_CAMPSITE_WELCOME_PRIMARY_CTA_TAPPED: "my_campsite_welcome_primary_cta_tapped",
  MY_CAMPSITE_WELCOME_DISMISSED: "my_campsite_welcome_dismissed",
} as const;

// ============================================
// ONBOARDING COMPLETION REASONS
// ============================================

export type OnboardingCompletionReason = "2_core_actions" | "day_30" | "opted_out";

// ============================================
// PERMISSION TYPES
// ============================================

export type PermissionType = "push";
export type PermissionStatus = "granted" | "denied" | "undetermined";

// ============================================
// ANALYTICS SERVICE
// ============================================

class AnalyticsService {
  private isInitialized = false;

  /**
   * Initialize analytics (call once at app start)
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    try {
      // Analytics is automatically initialized with Firebase
      this.isInitialized = true;
      console.log("[Analytics] Initialized");
    } catch (error) {
      console.error("[Analytics] Failed to initialize:", error);
    }
  }

  /**
   * Set user ID for analytics
   */
  async setAnalyticsUserId(userId: string | null): Promise<void> {
    try {
      if (userId) {
        setUserId(analytics, userId);
      }
    } catch (error) {
      console.error("[Analytics] Failed to set user ID:", error);
    }
  }

  /**
   * Set user properties
   */
  async setUserProperty(name: string, value: string | null): Promise<void> {
    try {
      setUserProperties(analytics, { [name]: value });
    } catch (error) {
      console.error("[Analytics] Failed to set user property:", error);
    }
  }

  // ============================================
  // APP LIFECYCLE EVENTS
  // ============================================

  /**
   * Track app open
   */
  async trackAppOpen(): Promise<void> {
    try {
      logEvent(analytics, AnalyticsEvents.APP_OPEN, {
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[Analytics] Failed to track app_open:", error);
    }
  }

  // ============================================
  // ONBOARDING EVENTS
  // ============================================

  /**
   * Track onboarding started
   */
  async trackOnboardingStarted(): Promise<void> {
    try {
      logEvent(analytics, AnalyticsEvents.ONBOARDING_STARTED, {
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[Analytics] Failed to track onboarding_started:", error);
    }
  }

  /**
   * Track onboarding completed
   */
  async trackOnboardingCompleted(reason: OnboardingCompletionReason): Promise<void> {
    try {
      logEvent(analytics, AnalyticsEvents.ONBOARDING_COMPLETED, {
        reason,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[Analytics] Failed to track onboarding_completed:", error);
    }
  }

  // ============================================
  // PERMISSION EVENTS
  // ============================================

  /**
   * Track permission prompt shown
   */
  async trackPermissionPromptShown(type: PermissionType): Promise<void> {
    try {
      logEvent(analytics, AnalyticsEvents.PERMISSION_PROMPT_SHOWN, {
        type,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[Analytics] Failed to track permission_prompt_shown:", error);
    }
  }

  /**
   * Track permission result
   */
  async trackPermissionResult(type: PermissionType, status: PermissionStatus): Promise<void> {
    try {
      logEvent(analytics, AnalyticsEvents.PERMISSION_RESULT, {
        type,
        status,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[Analytics] Failed to track permission_result:", error);
    }
  }

  // ============================================
  // NOTIFICATION EVENTS
  // ============================================

  /**
   * Track push sent
   */
  async trackPushSent(key: string): Promise<void> {
    try {
      logEvent(analytics, AnalyticsEvents.PUSH_SENT, {
        key,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[Analytics] Failed to track push_sent:", error);
    }
  }

  /**
   * Track push opened
   */
  async trackPushOpened(key: string): Promise<void> {
    try {
      logEvent(analytics, AnalyticsEvents.PUSH_OPENED, {
        key,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[Analytics] Failed to track push_opened:", error);
    }
  }

  /**
   * Track email sent
   */
  async trackEmailSent(key: string): Promise<void> {
    try {
      logEvent(analytics, AnalyticsEvents.EMAIL_SENT, {
        key,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[Analytics] Failed to track email_sent:", error);
    }
  }

  /**
   * Track email clicked
   */
  async trackEmailClicked(key: string): Promise<void> {
    try {
      logEvent(analytics, AnalyticsEvents.EMAIL_CLICKED, {
        key,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[Analytics] Failed to track email_clicked:", error);
    }
  }

  // ============================================
  // CORE ACTION EVENTS
  // ============================================

  /**
   * Track trip created
   */
  async trackTripCreated(tripId?: string): Promise<void> {
    try {
      logEvent(analytics, AnalyticsEvents.TRIP_CREATED, {
        trip_id: tripId,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[Analytics] Failed to track trip_created:", error);
    }
  }

  /**
   * Track packing list generated
   */
  async trackPackingListGenerated(tripId?: string): Promise<void> {
    try {
      logEvent(analytics, AnalyticsEvents.PACKINGLIST_GENERATED, {
        trip_id: tripId,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[Analytics] Failed to track packinglist_generated:", error);
    }
  }

  /**
   * Track gear item added
   */
  async trackGearItemAdded(itemCount?: number): Promise<void> {
    try {
      logEvent(analytics, AnalyticsEvents.GEAR_ITEM_ADDED, {
        item_count: itemCount,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[Analytics] Failed to track gear_item_added:", error);
    }
  }

  /**
   * Track saved place added
   */
  async trackSavedPlaceAdded(placeType?: string): Promise<void> {
    try {
      logEvent(analytics, AnalyticsEvents.SAVED_PLACE_ADDED, {
        place_type: placeType,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[Analytics] Failed to track saved_place_added:", error);
    }
  }

  /**
   * Track weather added to trip
   */
  async trackWeatherAddedToTrip(tripId?: string): Promise<void> {
    try {
      logEvent(analytics, AnalyticsEvents.WEATHER_ADDED_TO_TRIP, {
        trip_id: tripId,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[Analytics] Failed to track weather_added_to_trip:", error);
    }
  }

  /**
   * Track buddy invite sent
   */
  async trackBuddyInviteSent(method?: "email" | "text" | "copy"): Promise<void> {
    try {
      logEvent(analytics, AnalyticsEvents.BUDDY_INVITE_SENT, {
        method,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[Analytics] Failed to track buddy_invite_sent:", error);
    }
  }

  // ============================================
  // ENGAGEMENT EVENTS
  // ============================================

  /**
   * Track 7-day return
   */
  async trackReturnDay7(): Promise<void> {
    try {
      logEvent(analytics, AnalyticsEvents.RETURN_DAY_7, {
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[Analytics] Failed to track return_day_7:", error);
    }
  }

  // ============================================
  // GENERIC EVENT TRACKING
  // ============================================

  /**
   * Track a custom event
   */
  async trackEvent(eventName: string, params?: Record<string, any>): Promise<void> {
    try {
      logEvent(analytics, eventName, {
        ...params,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error(`[Analytics] Failed to track ${eventName}:`, error);
    }
  }
}

// Export singleton instance
export const analyticsService = new AnalyticsService();

// Export convenience functions
export const trackAppOpen = () => analyticsService.trackAppOpen();
export const trackOnboardingStarted = () => analyticsService.trackOnboardingStarted();
export const trackOnboardingCompleted = (reason: OnboardingCompletionReason) => analyticsService.trackOnboardingCompleted(reason);
export const trackPermissionPromptShown = (type: PermissionType) => analyticsService.trackPermissionPromptShown(type);
export const trackPermissionResult = (type: PermissionType, status: PermissionStatus) => analyticsService.trackPermissionResult(type, status);
export const trackPushSent = (key: string) => analyticsService.trackPushSent(key);
export const trackPushOpened = (key: string) => analyticsService.trackPushOpened(key);
export const trackEmailSent = (key: string) => analyticsService.trackEmailSent(key);
export const trackEmailClicked = (key: string) => analyticsService.trackEmailClicked(key);
export const trackTripCreated = (tripId?: string) => analyticsService.trackTripCreated(tripId);
export const trackPackingListGenerated = (tripId?: string) => analyticsService.trackPackingListGenerated(tripId);
export const trackGearItemAdded = (itemCount?: number) => analyticsService.trackGearItemAdded(itemCount);
export const trackSavedPlaceAdded = (placeType?: string) => analyticsService.trackSavedPlaceAdded(placeType);
export const trackWeatherAddedToTrip = (tripId?: string) => analyticsService.trackWeatherAddedToTrip(tripId);
export const trackBuddyInviteSent = (method?: "email" | "text" | "copy") => analyticsService.trackBuddyInviteSent(method);
export const trackReturnDay7 = () => analyticsService.trackReturnDay7();

// Gating & Monetization tracking functions
export const trackPaywallShown = (triggerKey: string, variant?: string) => 
  analyticsService.trackEvent(AnalyticsEvents.PAYWALL_SHOWN, { trigger_key: triggerKey, variant });
export const trackPaywallCtaTapped = (triggerKey: string, variant?: string) => 
  analyticsService.trackEvent(AnalyticsEvents.PAYWALL_PRIMARY_CTA_TAPPED, { trigger_key: triggerKey, variant });
export const trackPaywallDismissed = (triggerKey: string, variant?: string) => 
  analyticsService.trackEvent(AnalyticsEvents.PAYWALL_DISMISSED, { trigger_key: triggerKey, variant });
export const trackAccountRequiredShown = (triggerKey: string) => 
  analyticsService.trackEvent(AnalyticsEvents.ACCOUNT_REQUIRED_SHOWN, { trigger_key: triggerKey });
export const trackAccountRequiredCtaTapped = (triggerKey: string) => 
  analyticsService.trackEvent(AnalyticsEvents.ACCOUNT_REQUIRED_CTA_TAPPED, { trigger_key: triggerKey });
export const trackAccountRequiredDismissed = (triggerKey: string) => 
  analyticsService.trackEvent(AnalyticsEvents.ACCOUNT_REQUIRED_DISMISSED, { trigger_key: triggerKey });
export const trackProAttemptGate = (gateKey: string, attemptCount: number) => 
  analyticsService.trackEvent(AnalyticsEvents.PRO_ATTEMPT_GATE, { gate_key: gateKey, attempt_count: attemptCount });

// Welcome modal tracking functions
export const trackMyCampsiteWelcomeShown = () => 
  analyticsService.trackEvent(AnalyticsEvents.MY_CAMPSITE_WELCOME_SHOWN);
export const trackMyCampsiteWelcomeCtaTapped = () => 
  analyticsService.trackEvent(AnalyticsEvents.MY_CAMPSITE_WELCOME_PRIMARY_CTA_TAPPED);
export const trackMyCampsiteWelcomeDismissed = () => 
  analyticsService.trackEvent(AnalyticsEvents.MY_CAMPSITE_WELCOME_DISMISSED);
