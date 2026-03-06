/**
 * Analytics Service
 * Centralized analytics tracking for activation + retention metrics
 * 
 * Note: Firebase Analytics web SDK doesn't work in React Native (uses DOM APIs).
 * This service is a no-op in React Native environments.
 * For production React Native analytics, use @react-native-firebase/analytics instead.
 */

import { Platform } from "react-native";

// Only import Firebase Analytics types - actual implementation is no-op in RN
type Analytics = any;

// Check if we're in a web environment (not React Native)
const isWebEnvironment = Platform.OS === "web";

// Analytics instance - only used in web
let analytics: Analytics | null = null;
let analyticsInitialized = false;

async function getAnalyticsInstance(): Promise<Analytics | null> {
  // Never use Firebase Analytics web SDK in React Native
  if (!isWebEnvironment) {
    return null;
  }
  
  if (analyticsInitialized) return analytics;
  analyticsInitialized = true;
  
  try {
    // Dynamic import to prevent loading in RN
    const { getAnalytics, isSupported } = await import("firebase/analytics");
    const { default: firebaseApp } = await import("../config/firebase");
    
    const supported = await isSupported();
    if (supported) {
      analytics = getAnalytics(firebaseApp);
    }
  } catch (error) {
    console.log("[Analytics] Firebase Analytics not available");
  }
  return analytics;
}

// Helper to get Firebase Analytics functions (only in web)
async function getAnalyticsFunctions() {
  if (!isWebEnvironment) return null;
  try {
    const { logEvent, setUserId, setUserProperties } = await import("firebase/analytics");
    return { logEvent, setUserId, setUserProperties };
  } catch {
    return null;
  }
}

// Core logging helper - all methods should use this
async function logAnalyticsEvent(eventName: string, params?: Record<string, any>): Promise<void> {
  if (!isWebEnvironment) return;
  const instance = await getAnalyticsInstance();
  if (!instance) return;
  const fns = await getAnalyticsFunctions();
  if (!fns) return;
  try {
    fns.logEvent(instance, eventName, { ...params, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error(`[Analytics] Failed to track ${eventName}:`, error);
  }
}

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
  
  // Upsell Modals (Trial prompts)
  UPSELL_MODAL_VIEWED: "upsell_modal_viewed",
  UPSELL_MODAL_DISMISSED: "upsell_modal_dismissed",
  UPSELL_CTA_CLICKED: "upsell_cta_clicked",
  TRIP2_GATE_VIEWED: "trip2_gate_viewed",
  TRIP2_GATE_DISMISSED: "trip2_gate_dismissed",
  
  // Purchases
  PURCHASE_COMPLETED: "purchase_completed",
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
    const instance = await getAnalyticsInstance();
    if (!instance) return;
    const fns = await getAnalyticsFunctions();
    if (!fns) return;
    try {
      if (userId) {
        fns.setUserId(instance, userId);
      }
    } catch (error) {
      console.error("[Analytics] Failed to set user ID:", error);
    }
  }

  /**
   * Set user properties
   */
  async setUserProperty(name: string, value: string | null): Promise<void> {
    const instance = await getAnalyticsInstance();
    if (!instance) return;
    const fns = await getAnalyticsFunctions();
    if (!fns) return;
    try {
      fns.setUserProperties(instance, { [name]: value });
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
    await logAnalyticsEvent(AnalyticsEvents.APP_OPEN);
  }

  // ============================================
  // ONBOARDING EVENTS
  // ============================================

  /**
   * Track onboarding started
   */
  async trackOnboardingStarted(): Promise<void> {
    await logAnalyticsEvent(AnalyticsEvents.ONBOARDING_STARTED);
  }

  /**
   * Track onboarding completed
   */
  async trackOnboardingCompleted(reason: OnboardingCompletionReason): Promise<void> {
    await logAnalyticsEvent(AnalyticsEvents.ONBOARDING_COMPLETED, { reason });
  }

  // ============================================
  // PERMISSION EVENTS
  // ============================================

  /**
   * Track permission prompt shown
   */
  async trackPermissionPromptShown(type: PermissionType): Promise<void> {
    await logAnalyticsEvent(AnalyticsEvents.PERMISSION_PROMPT_SHOWN, { type });
  }

  /**
   * Track permission result
   */
  async trackPermissionResult(type: PermissionType, status: PermissionStatus): Promise<void> {
    await logAnalyticsEvent(AnalyticsEvents.PERMISSION_RESULT, { type, status });
  }

  // ============================================
  // NOTIFICATION EVENTS
  // ============================================

  /**
   * Track push sent
   */
  async trackPushSent(key: string): Promise<void> {
    await logAnalyticsEvent(AnalyticsEvents.PUSH_SENT, { key });
  }

  /**
   * Track push opened
   */
  async trackPushOpened(key: string): Promise<void> {
    await logAnalyticsEvent(AnalyticsEvents.PUSH_OPENED, { key });
  }

  /**
   * Track email sent
   */
  async trackEmailSent(key: string): Promise<void> {
    await logAnalyticsEvent(AnalyticsEvents.EMAIL_SENT, { key });
  }

  /**
   * Track email clicked
   */
  async trackEmailClicked(key: string): Promise<void> {
    await logAnalyticsEvent(AnalyticsEvents.EMAIL_CLICKED, { key });
  }

  // ============================================
  // CORE ACTION EVENTS
  // ============================================

  /**
   * Track trip created
   */
  async trackTripCreated(tripId?: string): Promise<void> {
    await logAnalyticsEvent(AnalyticsEvents.TRIP_CREATED, { trip_id: tripId });
  }

  /**
   * Track packing list generated
   */
  async trackPackingListGenerated(tripId?: string): Promise<void> {
    await logAnalyticsEvent(AnalyticsEvents.PACKINGLIST_GENERATED, { trip_id: tripId });
  }

  /**
   * Track gear item added
   */
  async trackGearItemAdded(itemCount?: number): Promise<void> {
    await logAnalyticsEvent(AnalyticsEvents.GEAR_ITEM_ADDED, { item_count: itemCount });
  }

  /**
   * Track saved place added
   */
  async trackSavedPlaceAdded(placeType?: string): Promise<void> {
    await logAnalyticsEvent(AnalyticsEvents.SAVED_PLACE_ADDED, { place_type: placeType });
  }

  /**
   * Track weather added to trip
   */
  async trackWeatherAddedToTrip(tripId?: string): Promise<void> {
    await logAnalyticsEvent(AnalyticsEvents.WEATHER_ADDED_TO_TRIP, { trip_id: tripId });
  }

  /**
   * Track buddy invite sent
   */
  async trackBuddyInviteSent(method?: "email" | "text" | "copy"): Promise<void> {
    await logAnalyticsEvent(AnalyticsEvents.BUDDY_INVITE_SENT, { method });
  }

  // ============================================
  // ENGAGEMENT EVENTS
  // ============================================

  /**
   * Track 7-day return
   */
  async trackReturnDay7(): Promise<void> {
    await logAnalyticsEvent(AnalyticsEvents.RETURN_DAY_7);
  }

  // ============================================
  // GENERIC EVENT TRACKING
  // ============================================

  /**
   * Track a custom event
   */
  async trackEvent(eventName: string, params?: Record<string, any>): Promise<void> {
    await logAnalyticsEvent(eventName, params);
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

// Upsell modal tracking functions
export type UpsellModalAnalyticsType = "completion" | "packing" | "invite" | "trip2_gate" | "badge_earned" | "learning_complete";

export const trackUpsellModalViewed = (type: UpsellModalAnalyticsType) => 
  analyticsService.trackEvent(AnalyticsEvents.UPSELL_MODAL_VIEWED, { type });
export const trackUpsellModalDismissed = (type: UpsellModalAnalyticsType) => 
  analyticsService.trackEvent(AnalyticsEvents.UPSELL_MODAL_DISMISSED, { type });
export const trackUpsellCtaClicked = (type: UpsellModalAnalyticsType) => 
  analyticsService.trackEvent(AnalyticsEvents.UPSELL_CTA_CLICKED, { type });
export const trackTrip2GateViewed = () => 
  analyticsService.trackEvent(AnalyticsEvents.TRIP2_GATE_VIEWED);
export const trackTrip2GateDismissed = () => 
  analyticsService.trackEvent(AnalyticsEvents.TRIP2_GATE_DISMISSED);

// Purchase tracking functions
export const trackPurchaseCompleted = (plan: string) => 
  analyticsService.trackEvent(AnalyticsEvents.PURCHASE_COMPLETED, { plan });
