/**
 * User Preferences Types
 * Comprehensive email and push notification preferences
 * Supports OS permission tracking and compliance-ready email segmentation
 */

// ============================================
// NOTIFICATION PERMISSION STATUS
// ============================================

/**
 * OS-level permission status for push notifications
 * - unknown: Never requested or app freshly installed
 * - granted: User allowed notifications
 * - denied: User denied notifications
 */
export type NotificationPermissionStatus = "unknown" | "granted" | "denied";

/**
 * Email consent region for GDPR/CAN-SPAM compliance
 * - US_optout: CAN-SPAM (opt-out model, can email by default with unsubscribe)
 * - GDPR_optin: UK/EU (opt-in model, must have explicit consent)
 * - unknown: Region not determined (treat as US_optout for now with easy opt-out)
 */
export type EmailConsentRegion = "US_optout" | "GDPR_optin" | "unknown";

// ============================================
// USER PREFERENCES DATA MODEL
// ============================================

/**
 * User document fields for notification/email preferences
 * Stored in users/{uid}
 */
export interface UserPreferences {
  // Push Notification Preferences
  notificationsEnabled: boolean; // User's in-app preference (default: true)
  notificationPermissionStatus: NotificationPermissionStatus; // OS permission status (default: "unknown")

  // Email Preferences (split by category)
  emailTransactionalEnabled: boolean; // Invites, account notices (default: true, always allowed)
  emailMarketingEnabled: boolean; // Drip campaign, newsletters (default: true for US, false for GDPR)
  emailConsentRegion: EmailConsentRegion; // For future geo-based compliance

  // Onboarding tracking (extended)
  onboarding: UserOnboardingData;
}

/**
 * Extended onboarding data model with email/push tracking
 */
export interface UserOnboardingData {
  startedAt: Date | FirebaseFirestore.Timestamp;
  lastActiveAt: Date | FirebaseFirestore.Timestamp;
  
  // Push tracking
  lastPushAt?: Date | FirebaseFirestore.Timestamp;
  pushesThisWeek: number;
  weekStartedAt?: Date | FirebaseFirestore.Timestamp;
  
  // Email tracking  
  lastEmailAt?: Date | FirebaseFirestore.Timestamp;
  emailsThisWeek: number;
  emailWeekStartedAt?: Date | FirebaseFirestore.Timestamp;
  
  // Re-engagement
  lastReengageAt?: Date | FirebaseFirestore.Timestamp; // For 30-day inactive nudge suppression
  
  // In-app nudge tracking
  lastNudgeKey?: string;
  lastNudgeAt?: Date | FirebaseFirestore.Timestamp;
  
  // Completed actions
  completedActions: OnboardingCompletedActions;
  counters: OnboardingCounters;
  
  // Campaign status
  campaignCompleted?: boolean;
  campaignCompletedReason?: "2_core_actions" | "day_30";
  campaignCompletedAt?: Date | FirebaseFirestore.Timestamp;
}

export interface OnboardingCompletedActions {
  createdTrip?: boolean;
  generatedPackingList?: boolean;
  added5GearItems?: boolean;
  savedPlace?: boolean;
  addedWeatherToTrip?: boolean;
  invitedBuddy?: boolean;
  savedCustomPackingList?: boolean;
  favoriteCampingStyleSet?: boolean;
  addedMealPlan?: boolean;
  postedTipOrQuestion?: boolean;
}

export interface OnboardingCounters {
  gearItemsCount?: number;
  tripsCount?: number;
  savedPlacesCount?: number;
}

// ============================================
// EMAIL SUBSCRIBER DOCUMENT
// ============================================

/**
 * Email subscriber document
 * Stored in emailSubscribers/{email} or emailSubscribers/{uid}
 */
export interface EmailSubscriber {
  email: string;
  userId?: string;
  
  // Subscription status
  unsubscribed: boolean; // Master unsubscribe (stops all marketing)
  marketingUnsubscribed?: boolean; // Specific marketing unsubscribe
  
  // Source tracking
  source: "signup" | "app-settings" | "sendgrid-webhook" | "manual";
  
  // Timestamps
  createdAt: Date | FirebaseFirestore.Timestamp;
  updatedAt: Date | FirebaseFirestore.Timestamp;
  unsubscribedAt?: Date | FirebaseFirestore.Timestamp;
}

// ============================================
// DRIP EMAIL CAMPAIGN TYPES
// ============================================

export type DripEmailType =
  | "welcome"
  | "day_1"
  | "day_4"
  | "day_7"
  | "day_14"
  | "day_21"
  | "day_30"
  | "inactive_30_days";

export interface DripEmailContent {
  type: DripEmailType;
  headline: string;
  body: string;
  ctaText: string;
  ctaLink: string;
  preheader: string;
  tip1?: string;
  tip2?: string;
  tip3?: string;
}

/**
 * Drip email schedule
 */
export const DRIP_EMAIL_SCHEDULE: DripEmailContent[] = [
  {
    type: "welcome",
    headline: "Welcome to The Complete Camping App! 🏕️",
    body: "You're all set to plan your next camping adventure. Let's get started with your first trip.",
    ctaText: "Start Your First Trip",
    ctaLink: "cta://plan/new",
    preheader: "Your next trip gets easier from here. Start a plan, build a packing list, and save places you love.",
  },
  {
    type: "day_4",
    headline: "Ready to pack smarter?",
    body: "Generate a packing list in 30 seconds. Pick your camping style and season, and we'll handle the rest.",
    ctaText: "Build Your Packing List",
    ctaLink: "cta://packinglist/start",
    preheader: "Never forget your headlamp again. Smart packing lists built for your trip.",
    tip1: "💡 Pro tip: Save your list as a template for future trips",
  },
  {
    type: "day_7",
    headline: "Your gear closet is waiting",
    body: "Add your favorite gear once, and it's ready for every trip. No more second-guessing what you own.",
    ctaText: "Add Your Gear",
    ctaLink: "cta://gearcloset",
    preheader: "Build your digital gear closet and pack smarter every time.",
    tip1: "🎒 Start with your tent, sleeping bag, and favorite camp chair",
    tip2: "⭐ Mark items as favorites to find them quickly",
  },
  {
    type: "day_14",
    headline: "Save spots you'll love",
    body: "Found a campground you want to remember? Save it so it's one tap away when you're ready to book.",
    ctaText: "Explore Parks",
    ctaLink: "cta://parks",
    preheader: "Discover and save campgrounds for your next adventure.",
    tip1: "❤️ Heart your favorite parks to find them later",
    tip2: "📍 Add custom notes about the best sites",
  },
  {
    type: "day_21",
    headline: "Camping is better together",
    body: "Invite your camping crew to share trips, packing lists, and photos all in one place.",
    ctaText: "Invite a Buddy",
    ctaLink: "cta://campground/invite",
    preheader: "Share the adventure with friends and family.",
    tip1: "👥 Everyone can add items to shared packing lists",
    tip2: "📸 Trip photos stay together in one album",
  },
  {
    type: "inactive_30_days",
    headline: "Your sleeping bag is bored 😴",
    body: "It's been too long since you treated yourself to a camping trip. Let's start a plan.",
    ctaText: "Start a New Plan",
    ctaLink: "cta://plan/new",
    preheader: "It's been too long since you treated yourself to a camping trip. Let's start a plan.",
  },
];

// ============================================
// CONFIGURATION CONSTANTS
// ============================================

export const EMAIL_CONFIG = {
  // SendGrid Template IDs
  DRIP_TEMPLATE_ID: "d-33e554033ea641fdb7288ce884923c33",
  CAMPGROUND_INVITE_TEMPLATE_ID: "d-a00eabe7198844468abf694b6cbea063",
  
  // Frequency caps
  maxMarketingEmailsPerWeek: 2,
  
  // Transactional emails are not capped
  transactionalEnabled: true,
};

export const PUSH_CONFIG = {
  // Frequency caps
  maxPushesPerWeek: 2,
  
  // Quiet hours (user local time)
  quietHoursStart: 19, // 7 PM
  quietHoursEnd: 10, // 10 AM
  preferredSendHour: 11, // 11 AM
  
  // Suppression
  recentActivitySuppressionHours: 12,
  
  // Re-engagement
  inactivityThresholdDays: 30,
  reengagementSuppressionDays: 30, // Don't send again for 30 days after re-engagement
};

// ============================================
// DEFAULT USER PREFERENCES
// ============================================

export const DEFAULT_USER_PREFERENCES: Partial<UserPreferences> = {
  notificationsEnabled: true,
  notificationPermissionStatus: "unknown",
  emailTransactionalEnabled: true,
  emailMarketingEnabled: true, // Default true, but respect unsubscribes
  emailConsentRegion: "unknown",
};

// ============================================
// PUSH ELIGIBILITY CHECK
// ============================================

export interface PushEligibilityResult {
  eligible: boolean;
  reason?: string;
}

export interface EmailEligibilityResult {
  eligible: boolean;
  reason?: string;
  isTransactional: boolean;
}
