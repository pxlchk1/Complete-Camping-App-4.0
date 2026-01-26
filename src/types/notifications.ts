/**
 * Notification Campaign Types
 * 30-Day Non-Intrusive Onboarding Campaign
 */

// ============================================
// CORE ACTION KEYS (any 2 ends onboarding)
// ============================================

export type CoreActionKey =
  | "createdTrip"
  | "generatedPackingList"
  | "added5GearItems"
  | "savedPlace"
  | "addedWeatherToTrip"
  | "invitedBuddy";

export const CORE_ACTIONS: CoreActionKey[] = [
  "createdTrip",
  "generatedPackingList",
  "added5GearItems",
  "savedPlace",
  "addedWeatherToTrip",
  "invitedBuddy",
];

// ============================================
// ONBOARDING DATA MODEL
// ============================================

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

export interface UserOnboarding {
  startedAt: FirebaseFirestore.Timestamp | Date;
  lastActiveAt: FirebaseFirestore.Timestamp | Date;
  lastPushAt?: FirebaseFirestore.Timestamp | Date;
  pushesThisWeek: number;
  weekStartedAt?: FirebaseFirestore.Timestamp | Date;
  lastNudgeKey?: string;
  completedActions: OnboardingCompletedActions;
  counters: OnboardingCounters;
  campaignCompleted?: boolean;
  campaignCompletedReason?: "2_core_actions" | "day_30";
  campaignCompletedAt?: FirebaseFirestore.Timestamp | Date;
}

// ============================================
// NOTIFICATION TYPES
// ============================================

export type NotificationType =
  // Time-based onboarding
  | "onboarding_day_1"
  | "onboarding_day_3"
  | "onboarding_day_5"
  | "onboarding_day_7"
  | "onboarding_day_9"
  | "onboarding_day_11"
  | "onboarding_day_14"
  | "onboarding_day_16"
  | "onboarding_day_18"
  | "onboarding_day_21"
  | "onboarding_day_23"
  | "onboarding_day_26"
  | "onboarding_day_30"
  // Event-based triggers
  | "trip_no_packing_list_24h"
  | "trip_starts_3_days"
  | "trip_starts_tomorrow"
  | "gear_item_added"
  | "place_favorited"
  // Re-engagement
  | "inactive_30_days";

export type NotificationStatus = "pending" | "sent" | "suppressed" | "failed";

export type SuppressionReason =
  | "notifications_disabled"
  | "no_push_token"
  | "quiet_hours"
  | "frequency_cap"
  | "recently_active"
  | "action_already_completed"
  | "campaign_completed"
  | "trip_cancelled"
  | "trip_already_started"
  | "duplicate";

// ============================================
// NOTIFICATION QUEUE DOCUMENT
// ============================================

export interface NotificationQueueItem {
  id?: string;
  userId: string;
  type: NotificationType;
  sendAt: FirebaseFirestore.Timestamp | Date;
  payload: NotificationPayload;
  status: NotificationStatus;
  suppressionReason?: SuppressionReason;
  createdAt: FirebaseFirestore.Timestamp | Date;
  sentAt?: FirebaseFirestore.Timestamp | Date;
  metadata?: Record<string, any>;
}

export interface NotificationPayload {
  title: string;
  body: string;
  deepLink: string;
  actionKey?: CoreActionKey | string;
  tripId?: string;
}

// ============================================
// ONBOARDING SCHEDULE
// ============================================

export interface OnboardingMessage {
  day: number;
  type: NotificationType;
  title: string;
  body: string;
  deepLink: string;
  actionKey?: string;
  suppressIfCompleted?: CoreActionKey | string;
}

export const ONBOARDING_SCHEDULE: OnboardingMessage[] = [
  {
    day: 1,
    type: "onboarding_day_1",
    title: "Welcome to Complete Camping App",
    body: "Want a 30-second win? Start a trip and we'll build your plan from it.",
    deepLink: "cta://plan/new",
    actionKey: "createdTrip",
    suppressIfCompleted: "createdTrip",
  },
  {
    day: 3,
    type: "onboarding_day_3",
    title: "Your packing list is ready",
    body: "Pick your camping style and season. We'll prefill the basics.",
    deepLink: "cta://packinglist/start",
    actionKey: "generatedPackingList",
    suppressIfCompleted: "generatedPackingList",
  },
  {
    day: 5,
    type: "onboarding_day_5",
    title: "Save your next spot",
    body: "Favorite a campground or park so it's one tap next time.",
    deepLink: "cta://parks",
    actionKey: "savedPlace",
    suppressIfCompleted: "savedPlace",
  },
  {
    day: 7,
    type: "onboarding_day_7",
    title: "Make packing faster",
    body: "Add 5 gear items. Next time, packing is basically done.",
    deepLink: "cta://gearcloset",
    actionKey: "added5GearItems",
    suppressIfCompleted: "added5GearItems",
  },
  {
    day: 9,
    type: "onboarding_day_9",
    title: "Planning soon?",
    body: "Add dates and a location so everything stays in one place.",
    deepLink: "cta://plan",
    actionKey: "createdTrip",
    suppressIfCompleted: "createdTrip",
  },
  {
    day: 11,
    type: "onboarding_day_11",
    title: "Fewer 'did we forget it?' moments",
    body: "Use the category checklist (shelter, sleep, kitchen) for a quick scan.",
    deepLink: "cta://packinglist/categories",
    actionKey: "generatedPackingList",
    suppressIfCompleted: "generatedPackingList",
  },
  {
    day: 14,
    type: "onboarding_day_14",
    title: "Quick weather check",
    body: "Add a forecast to your trip so it's easy to find later.",
    deepLink: "cta://weather",
    actionKey: "addedWeatherToTrip",
    suppressIfCompleted: "addedWeatherToTrip",
  },
  {
    day: 16,
    type: "onboarding_day_16",
    title: "Make it feel like yours",
    body: "Set your favorite camping style and we'll tailor your home screen.",
    deepLink: "cta://profile/edit",
    actionKey: "favoriteCampingStyleSet",
    suppressIfCompleted: "favoriteCampingStyleSet",
  },
  {
    day: 18,
    type: "onboarding_day_18",
    title: "Save your best list",
    body: "'My winter car camping list' then reuse it forever.",
    deepLink: "cta://packinglist/save-template",
    actionKey: "savedCustomPackingList",
    suppressIfCompleted: "savedCustomPackingList",
  },
  {
    day: 21,
    type: "onboarding_day_21",
    title: "Camping with friends?",
    body: "Invite a campground buddy so plans and photos stay together.",
    deepLink: "cta://campground/invite",
    actionKey: "invitedBuddy",
    suppressIfCompleted: "invitedBuddy",
  },
  {
    day: 23,
    type: "onboarding_day_23",
    title: "One quick win today",
    body: "Save a place you want to camp this year.",
    deepLink: "cta://parks",
    actionKey: "savedPlace",
    suppressIfCompleted: "savedPlace",
  },
  {
    day: 26,
    type: "onboarding_day_26",
    title: "Meal planning, simplified",
    body: "Add one dinner, then tap suggestions for breakfast, lunch, and snack.",
    deepLink: "cta://meals",
    actionKey: "addedMealPlan",
    suppressIfCompleted: "addedMealPlan",
  },
  {
    day: 30,
    type: "onboarding_day_30",
    title: "Got a camping win?",
    body: "Drop one tip or question and help the community grow.",
    deepLink: "cta://community",
    actionKey: "postedTipOrQuestion",
  },
];

// ============================================
// EVENT-BASED TRIGGERS
// ============================================

export interface EventTriggerConfig {
  type: NotificationType;
  title: string;
  body: string;
  deepLink: string;
  delayHours?: number;
  suppressIfCompleted?: string;
  inAppOnly?: boolean;
}

export const EVENT_TRIGGERS: Record<string, EventTriggerConfig> = {
  trip_no_packing_list: {
    type: "trip_no_packing_list_24h",
    title: "Want me to build your packing list?",
    body: "Tap once and tweak it for your trip.",
    deepLink: "cta://packinglist/from-trip?tripId={tripId}",
    delayHours: 24,
    suppressIfCompleted: "generatedPackingList",
  },
  trip_starts_3_days: {
    type: "trip_starts_3_days",
    title: "Trip coming up",
    body: "Quick packing scan and weather in one place.",
    deepLink: "cta://trip/{tripId}",
  },
  trip_starts_tomorrow: {
    type: "trip_starts_tomorrow",
    title: "Tomorrow's the day",
    body: "Open your packing list for a final 2-minute check.",
    deepLink: "cta://trip/{tripId}/packing",
  },
  gear_item_added: {
    type: "gear_item_added",
    title: "Nice add",
    body: "Want to drop it into a packing list so you don't forget it?",
    deepLink: "cta://packinglist/add-from-gear",
    inAppOnly: true,
  },
  place_favorited: {
    type: "place_favorited",
    title: "Saved",
    body: "Want to turn that into a trip plan?",
    deepLink: "cta://plan/new?fromSavedPlace=1",
    inAppOnly: true,
  },
  inactive_30_days: {
    type: "inactive_30_days",
    title: "Your sleeping bag is bored",
    body: "It's been too long since you treated yourself to a camping trip. Let's start a plan.",
    deepLink: "cta://plan/new",
  },
};

// ============================================
// DEEP LINK MAPPING
// ============================================

export const DEEP_LINK_ROUTES: Record<string, { screen: string; params?: Record<string, any> }> = {
  "cta://plan/new": { screen: "CreateTrip" },
  "cta://plan": { screen: "MainTabs", params: { screen: "Plan" } },
  "cta://packinglist/start": { screen: "PackingListGenerate" },
  "cta://packinglist/categories": { screen: "PackingList" },
  "cta://packinglist/save-template": { screen: "PackingList" },
  "cta://packinglist/add-from-gear": { screen: "GearCloset" },
  "cta://parks": { screen: "NationalParksList" },
  "cta://gearcloset": { screen: "GearCloset" },
  "cta://weather": { screen: "MainTabs", params: { screen: "Plan" } },
  "cta://profile/edit": { screen: "EditProfile" },
  "cta://campground/invite": { screen: "AddCamper" },
  "cta://meals": { screen: "MainTabs", params: { screen: "Plan" } },
  "cta://community": { screen: "MainTabs", params: { screen: "Community" } },
};

// ============================================
// CONFIGURATION CONSTANTS
// ============================================

export const NOTIFICATION_CONFIG = {
  // Quiet hours (user local time)
  quietHoursStart: 19, // 7 PM
  quietHoursEnd: 10, // 10 AM
  preferredSendHour: 11, // 11 AM

  // Frequency caps
  maxPushesPerWeek: 2,
  allowExtraPushNearTrip: true,
  tripReminderExtraAllowance: 1,
  tripReminderWindowDays: 3,

  // Suppression
  recentActivitySuppressionHours: 12,
  permissionRepromptDays: 30,

  // Campaign completion
  coreActionsToComplete: 2,
  campaignDurationDays: 30,

  // Re-engagement
  inactivityThresholdDays: 30,
};

// ============================================
// ANALYTICS EVENT NAMES
// ============================================

export const NOTIFICATION_ANALYTICS = {
  NOTIFICATION_SENT: "notification_sent",
  NOTIFICATION_OPENED: "notification_opened",
  NOTIFICATION_SUPPRESSED: "notification_suppressed",
  ONBOARDING_ACTION_COMPLETED: "onboarding_action_completed",
  CAMPAIGN_COMPLETED: "campaign_completed",
  INACTIVE_NUDGE_SENT: "user_inactive_30d_nudge_sent",
};
