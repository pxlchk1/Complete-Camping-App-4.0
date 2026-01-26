/**
 * Gating Registry - Single Source of Truth
 * 
 * This file defines ALL access gates in the app.
 * Used for documentation, dev tools, and runtime gate checks.
 */

// Gate level types
export type GateLevel = "account_required" | "pro_required" | "free_limit";

// Modal types
export type TriggerModal = "AccountRequiredModal" | "PaywallModal";

// Gate definition interface
export interface GateDefinition {
  /** Unique identifier for this gate */
  gateKey: string;
  
  /** Human-readable title */
  title: string;
  
  /** Gate level */
  level: GateLevel;
  
  /** Free tier limit (null if no limit applies) */
  freeLimit: number | null;
  
  /** Whether this gate increments the global Pro attempt counter */
  countsTowardProAttempt: boolean;
  
  /** Screen(s) where this gate is enforced */
  screens: string[];
  
  /** Action(s) this gate protects */
  actions: string[];
  
  /** Which modal is shown when gated */
  triggerModal: TriggerModal;
  
  /** PaywallScreen triggerKey for content customization (null if N/A) */
  paywallTriggerKey: string | null;
  
  /** AccountRequiredModal triggerKey for content customization (null if N/A) */
  accountModalTriggerKey: string | null;
  
  /** Additional notes for developers */
  notes?: string;
}

/**
 * Complete registry of all gates in the app
 */
export const GATING_REGISTRY: GateDefinition[] = [
  // ============================================
  // ACCOUNT REQUIRED GATES
  // (FREE actions that just require an account)
  // ============================================
  {
    gateKey: "home_trip_plans_quick_action",
    title: "Trip Plans Quick Action",
    level: "account_required",
    freeLimit: null,
    countsTowardProAttempt: false,
    screens: ["HomeScreen"],
    actions: ["navigateToTripPlans"],
    triggerModal: "AccountRequiredModal",
    paywallTriggerKey: null,
    accountModalTriggerKey: "trip_plans_quick_action",
    notes: "Quick action on home screen for guests",
  },
  {
    gateKey: "home_gear_closet_quick_action",
    title: "My Gear Closet Quick Action",
    level: "account_required",
    freeLimit: null,
    countsTowardProAttempt: false,
    screens: ["HomeScreen"],
    actions: ["navigateToGearCloset"],
    triggerModal: "AccountRequiredModal",
    paywallTriggerKey: null,
    accountModalTriggerKey: "gear_closet_quick_action",
    notes: "Quick action on home screen for guests",
  },
  {
    gateKey: "home_campground_quick_action",
    title: "My Campground Quick Action",
    level: "account_required",
    freeLimit: null,
    countsTowardProAttempt: false,
    screens: ["HomeScreen"],
    actions: ["navigateToCampground"],
    triggerModal: "AccountRequiredModal",
    paywallTriggerKey: null,
    accountModalTriggerKey: "my_campground_quick_action",
    notes: "Quick action on home screen for guests",
  },
  {
    gateKey: "create_first_trip",
    title: "Create First Trip",
    level: "account_required",
    freeLimit: null,
    countsTowardProAttempt: false,
    screens: ["ParksBrowseScreen", "PackingListScreen", "MealsScreen"],
    actions: ["createFirstTrip"],
    triggerModal: "AccountRequiredModal",
    paywallTriggerKey: null,
    accountModalTriggerKey: "create_first_trip",
    notes: "First trip is FREE, just needs account",
  },
  {
    gateKey: "save_favorite_account",
    title: "Save Favorite (Account)",
    level: "account_required",
    freeLimit: null,
    countsTowardProAttempt: false,
    screens: ["ParksDetailModal", "ParksBrowseScreen"],
    actions: ["saveFavorite"],
    triggerModal: "AccountRequiredModal",
    paywallTriggerKey: null,
    accountModalTriggerKey: "save_favorite",
    notes: "Guests need account to save favorites",
  },
  {
    gateKey: "my_campsite_access",
    title: "My Campsite Access",
    level: "account_required",
    freeLimit: null,
    countsTowardProAttempt: false,
    screens: ["MyCampsiteScreen"],
    actions: ["accessCampsite"],
    triggerModal: "AccountRequiredModal",
    paywallTriggerKey: null,
    accountModalTriggerKey: "my_campsite",
    notes: "Personal campsite requires account",
  },
  {
    gateKey: "ask_a_camper_post",
    title: "Ask a Camper Post",
    level: "account_required",
    freeLimit: null,
    countsTowardProAttempt: false,
    screens: ["AskACamperScreen"],
    actions: ["createPost"],
    triggerModal: "AccountRequiredModal",
    paywallTriggerKey: null,
    accountModalTriggerKey: "ask_a_camper_post",
    notes: "Posting requires account",
  },
  {
    gateKey: "add_gear_account",
    title: "Add Gear (Account)",
    level: "account_required",
    freeLimit: null,
    countsTowardProAttempt: false,
    screens: ["MyGearClosetScreen"],
    actions: ["addGearItem"],
    triggerModal: "AccountRequiredModal",
    paywallTriggerKey: null,
    accountModalTriggerKey: null,
    notes: "Guests redirected to Auth (not modal)",
  },
  {
    gateKey: "view_shared_trip",
    title: "View Shared Trip",
    level: "account_required",
    freeLimit: null,
    countsTowardProAttempt: false,
    screens: ["TripDetailScreen", "MyCampgroundScreen"],
    actions: ["viewSharedTrip"],
    triggerModal: "AccountRequiredModal",
    paywallTriggerKey: null,
    accountModalTriggerKey: "view_shared_trip",
    notes: "Guests need account to view trips shared by Campground friends (read-only access)",
  },
  {
    gateKey: "shared_trip_edit_blocked",
    title: "Shared Trip Edit Blocked",
    level: "account_required",
    freeLimit: null,
    countsTowardProAttempt: false,
    screens: ["TripDetailScreen"],
    actions: ["editSharedTrip"],
    triggerModal: "AccountRequiredModal",
    paywallTriggerKey: null,
    accountModalTriggerKey: null,
    notes: "Recipients cannot edit shared trips - read-only access only",
  },

  // ============================================
  // FREE LIMIT GATES
  // (Free tier has a cap, Pro is unlimited)
  // ============================================
  {
    gateKey: "gear_closet_limit",
    title: "Gear Closet Limit",
    level: "free_limit",
    freeLimit: 15,
    countsTowardProAttempt: true,
    screens: ["MyGearClosetScreen"],
    actions: ["addGearItem"],
    triggerModal: "PaywallModal",
    paywallTriggerKey: "gear_closet_limit",
    accountModalTriggerKey: null,
    notes: "FREE users limited to 15 gear items",
  },
  {
    gateKey: "favorites_limit",
    title: "Favorites Limit",
    level: "free_limit",
    freeLimit: 5,
    countsTowardProAttempt: true,
    screens: ["ParksDetailModal", "ParksBrowseScreen"],
    actions: ["saveFavorite"],
    triggerModal: "PaywallModal",
    paywallTriggerKey: "favorites_limit",
    accountModalTriggerKey: null,
    notes: "FREE users limited to 5 favorites",
  },
  {
    gateKey: "trip_limit",
    title: "Trip Limit",
    level: "free_limit",
    freeLimit: 1,
    countsTowardProAttempt: true,
    screens: ["ParksBrowseScreen", "PackingListScreen", "MealsScreen"],
    actions: ["createTrip"],
    triggerModal: "PaywallModal",
    paywallTriggerKey: "second_trip",
    accountModalTriggerKey: null,
    notes: "FREE users limited to 1 trip (second trip requires Pro)",
  },

  // ============================================
  // PRO REQUIRED GATES
  // (Features only available to Pro subscribers)
  // ============================================
  
  // --- Trip Management ---
  {
    gateKey: "create_trip_pro",
    title: "Create Trip (Pro)",
    level: "pro_required",
    freeLimit: null,
    countsTowardProAttempt: true,
    screens: ["ParksBrowseScreen", "PackingListScreen", "MealsScreen"],
    actions: ["createTrip"],
    triggerModal: "PaywallModal",
    paywallTriggerKey: "create_trip",
    accountModalTriggerKey: null,
    notes: "Creating trips after first trip requires Pro",
  },
  {
    gateKey: "custom_campsite",
    title: "Custom Campsite",
    level: "pro_required",
    freeLimit: null,
    countsTowardProAttempt: true,
    screens: ["ParksBrowseScreen"],
    actions: ["addCustomCampground"],
    triggerModal: "PaywallModal",
    paywallTriggerKey: "custom_campsite",
    accountModalTriggerKey: null,
    notes: "Adding custom campsites requires Pro",
  },
  {
    gateKey: "campground_sharing",
    title: "Campground Sharing",
    level: "pro_required",
    freeLimit: null,
    countsTowardProAttempt: true,
    screens: ["TripDetailScreen"],
    actions: ["addPeopleToTrip", "shareTripToCampground"],
    triggerModal: "PaywallModal",
    paywallTriggerKey: "campground_sharing",
    accountModalTriggerKey: null,
    notes: "Sharing trip with campground members requires Pro (sender must be Pro)",
  },
  {
    gateKey: "trip_notes",
    title: "Trip Notes",
    level: "pro_required",
    freeLimit: null,
    countsTowardProAttempt: true,
    screens: ["TripDetailScreen"],
    actions: ["editTripNotes"],
    triggerModal: "PaywallModal",
    paywallTriggerKey: "trip_notes",
    accountModalTriggerKey: null,
    notes: "Editing trip notes requires Pro",
  },
  {
    gateKey: "trip_links",
    title: "Trip Links",
    level: "pro_required",
    freeLimit: null,
    countsTowardProAttempt: true,
    screens: ["TripDetailScreen"],
    actions: ["addTripLink", "deleteTripLink"],
    triggerModal: "PaywallModal",
    paywallTriggerKey: "trip_links",
    accountModalTriggerKey: null,
    notes: "Managing trip links requires Pro",
  },
  {
    gateKey: "trip_add_people",
    title: "Add People to Trip",
    level: "pro_required",
    freeLimit: null,
    countsTowardProAttempt: true,
    screens: ["AddPeopleToTripScreen"],
    actions: ["submitAddPeople"],
    triggerModal: "PaywallModal",
    paywallTriggerKey: "trip_add_people",
    accountModalTriggerKey: null,
    notes: "Adding people to trip requires Pro",
  },

  // --- Packing Lists ---
  {
    gateKey: "packing_add_item",
    title: "Add Packing Item",
    level: "pro_required",
    freeLimit: null,
    countsTowardProAttempt: true,
    screens: ["PackingListScreen"],
    actions: ["addPackingItem"],
    triggerModal: "PaywallModal",
    paywallTriggerKey: "packing_add_item",
    accountModalTriggerKey: null,
    notes: "Adding packing items requires Pro",
  },
  {
    gateKey: "packing_delete_item",
    title: "Delete Packing Item",
    level: "pro_required",
    freeLimit: null,
    countsTowardProAttempt: true,
    screens: ["PackingListScreen"],
    actions: ["deletePackingItem"],
    triggerModal: "PaywallModal",
    paywallTriggerKey: "packing_delete_item",
    accountModalTriggerKey: null,
    notes: "Deleting packing items requires Pro",
  },
  {
    gateKey: "packing_customization",
    title: "Packing Customization",
    level: "pro_required",
    freeLimit: null,
    countsTowardProAttempt: true,
    screens: ["PackingListDetailScreenV2"],
    actions: ["customizePackingList"],
    triggerModal: "PaywallModal",
    paywallTriggerKey: "packing_customization",
    accountModalTriggerKey: null,
    notes: "Customizing packing lists requires Pro",
  },
  {
    gateKey: "packing_create_list",
    title: "Create Packing List",
    level: "pro_required",
    freeLimit: null,
    countsTowardProAttempt: true,
    screens: ["PackingListScreen"],
    actions: ["createPackingList"],
    triggerModal: "PaywallModal",
    paywallTriggerKey: "packing_create_list",
    accountModalTriggerKey: null,
    notes: "Creating packing lists requires Pro",
  },

  // --- Meal Planning ---
  {
    gateKey: "meals_add_to_trip",
    title: "Add Meal to Trip",
    level: "pro_required",
    freeLimit: null,
    countsTowardProAttempt: true,
    screens: ["MealsScreen"],
    actions: ["addMealToTrip"],
    triggerModal: "PaywallModal",
    paywallTriggerKey: "meals_add_to_trip",
    accountModalTriggerKey: null,
    notes: "Adding meals to trips requires Pro",
  },
  {
    gateKey: "meals_custom",
    title: "Custom Meal",
    level: "pro_required",
    freeLimit: null,
    countsTowardProAttempt: true,
    screens: ["MealsScreen"],
    actions: ["createCustomMeal", "saveCustomMeal"],
    triggerModal: "PaywallModal",
    paywallTriggerKey: "meals_custom",
    accountModalTriggerKey: null,
    notes: "Creating/saving custom meals requires Pro",
  },
  {
    gateKey: "meal_planning_add",
    title: "Add Meal (Planning)",
    level: "pro_required",
    freeLimit: null,
    countsTowardProAttempt: true,
    screens: ["MealPlanningScreen"],
    actions: ["addMealFromLibrary"],
    triggerModal: "PaywallModal",
    paywallTriggerKey: "meal_planning_add",
    accountModalTriggerKey: null,
    notes: "Adding meals from library requires Pro",
  },
  {
    gateKey: "meal_planning_custom",
    title: "Custom Meal (Planning)",
    level: "pro_required",
    freeLimit: null,
    countsTowardProAttempt: true,
    screens: ["MealPlanningScreen"],
    actions: ["addCustomMeal", "sheetCustomMeal"],
    triggerModal: "PaywallModal",
    paywallTriggerKey: "meal_planning_custom",
    accountModalTriggerKey: null,
    notes: "Creating custom meals in planning requires Pro",
  },
  {
    gateKey: "meal_planning_delete",
    title: "Delete Meal (Planning)",
    level: "pro_required",
    freeLimit: null,
    countsTowardProAttempt: true,
    screens: ["MealPlanningScreen"],
    actions: ["deleteMeal"],
    triggerModal: "PaywallModal",
    paywallTriggerKey: "meal_planning_delete",
    accountModalTriggerKey: null,
    notes: "Deleting meals requires Pro",
  },
  {
    gateKey: "meal_suggestions",
    title: "Meal Suggestions",
    level: "pro_required",
    freeLimit: null,
    countsTowardProAttempt: true,
    screens: ["MealPlanningScreen"],
    actions: ["openSuggestions"],
    triggerModal: "PaywallModal",
    paywallTriggerKey: "meal_suggestions",
    accountModalTriggerKey: null,
    notes: "AI meal suggestions require Pro",
  },
  {
    gateKey: "meal_planning_recipe",
    title: "Select Recipe",
    level: "pro_required",
    freeLimit: null,
    countsTowardProAttempt: true,
    screens: ["MealPlanningScreen"],
    actions: ["selectRecipe", "addRecipeToMeal"],
    triggerModal: "PaywallModal",
    paywallTriggerKey: "meal_planning_recipe",
    accountModalTriggerKey: null,
    notes: "Selecting recipes requires Pro",
  },
  {
    gateKey: "meal_suggestion",
    title: "Use Meal Suggestion",
    level: "pro_required",
    freeLimit: null,
    countsTowardProAttempt: true,
    screens: ["MealPlanningScreen"],
    actions: ["selectSuggestion"],
    triggerModal: "PaywallModal",
    paywallTriggerKey: "meal_suggestion",
    accountModalTriggerKey: null,
    notes: "Using meal suggestions requires Pro",
  },
  {
    gateKey: "meal_autofill",
    title: "Meal Auto-fill",
    level: "pro_required",
    freeLimit: null,
    countsTowardProAttempt: true,
    screens: ["MealPlanningScreen"],
    actions: ["autoFillDay"],
    triggerModal: "PaywallModal",
    paywallTriggerKey: "meal_autofill",
    accountModalTriggerKey: null,
    notes: "Auto-filling meals requires Pro",
  },

  // --- Learning ---
  {
    gateKey: "learning_module",
    title: "Learning Module",
    level: "pro_required",
    freeLimit: null,
    countsTowardProAttempt: true,
    screens: ["LearningModuleScreen"],
    actions: ["accessLockedModule"],
    triggerModal: "PaywallModal",
    paywallTriggerKey: "learning_module",
    accountModalTriggerKey: null,
    notes: "All modules except Leave No Trace require Pro",
  },

  // --- Weather ---
  {
    gateKey: "weather_trip",
    title: "Plan Trip from Weather",
    level: "pro_required",
    freeLimit: null,
    countsTowardProAttempt: true,
    screens: ["WeatherScreen"],
    actions: ["planTripFromWeather"],
    triggerModal: "PaywallModal",
    paywallTriggerKey: "weather_trip",
    accountModalTriggerKey: null,
    notes: "Planning trips from weather requires Pro",
  },

  // --- Community ---
  {
    gateKey: "gear_review_create",
    title: "Create Gear Review",
    level: "pro_required",
    freeLimit: null,
    countsTowardProAttempt: true,
    screens: ["GearReviewsListScreen"],
    actions: ["createGearReview"],
    triggerModal: "PaywallModal",
    paywallTriggerKey: "gear_review_create",
    accountModalTriggerKey: null,
    notes: "Creating gear reviews requires Pro",
  },
  {
    gateKey: "feedback_create",
    title: "Create Feedback",
    level: "pro_required",
    freeLimit: null,
    countsTowardProAttempt: true,
    screens: ["FeedbackListScreen"],
    actions: ["createFeedback"],
    triggerModal: "PaywallModal",
    paywallTriggerKey: "feedback_create",
    accountModalTriggerKey: null,
    notes: "Submitting feedback requires Pro",
  },
  {
    gateKey: "feedback_vote",
    title: "Vote on Feedback",
    level: "pro_required",
    freeLimit: null,
    countsTowardProAttempt: true,
    screens: ["FeedbackListScreen", "FeedbackDetailScreen"],
    actions: ["upvoteFeedback", "downvoteFeedback"],
    triggerModal: "PaywallModal",
    paywallTriggerKey: "feedback_vote",
    accountModalTriggerKey: null,
    notes: "Voting on feedback requires Pro",
  },
  {
    gateKey: "feedback_comment",
    title: "Comment on Feedback",
    level: "pro_required",
    freeLimit: null,
    countsTowardProAttempt: true,
    screens: ["FeedbackDetailScreen"],
    actions: ["addFeedbackComment"],
    triggerModal: "PaywallModal",
    paywallTriggerKey: "feedback_comment",
    accountModalTriggerKey: null,
    notes: "Commenting on feedback requires Pro",
  },
];

// ============================================
// Helper functions
// ============================================

/**
 * Get a gate definition by its key
 */
export function getGate(gateKey: string): GateDefinition | undefined {
  return GATING_REGISTRY.find((g) => g.gateKey === gateKey);
}

/**
 * Get all gates of a specific level
 */
export function getGatesByLevel(level: GateLevel): GateDefinition[] {
  return GATING_REGISTRY.filter((g) => g.level === level);
}

/**
 * Get all gates for a specific screen
 */
export function getGatesForScreen(screenName: string): GateDefinition[] {
  return GATING_REGISTRY.filter((g) => g.screens.includes(screenName));
}

/**
 * Get all unique paywall trigger keys
 */
export function getPaywallTriggerKeys(): string[] {
  return [...new Set(
    GATING_REGISTRY
      .filter((g) => g.paywallTriggerKey)
      .map((g) => g.paywallTriggerKey!)
  )];
}

/**
 * Get all unique account modal trigger keys
 */
export function getAccountModalTriggerKeys(): string[] {
  return [...new Set(
    GATING_REGISTRY
      .filter((g) => g.accountModalTriggerKey)
      .map((g) => g.accountModalTriggerKey!)
  )];
}

/**
 * Get summary statistics
 */
export function getGatingSummary(): {
  totalGates: number;
  accountRequired: number;
  proRequired: number;
  freeLimits: number;
  countsTowardProAttempt: number;
  uniquePaywallKeys: number;
  uniqueAccountKeys: number;
} {
  return {
    totalGates: GATING_REGISTRY.length,
    accountRequired: getGatesByLevel("account_required").length,
    proRequired: getGatesByLevel("pro_required").length,
    freeLimits: getGatesByLevel("free_limit").length,
    countsTowardProAttempt: GATING_REGISTRY.filter((g) => g.countsTowardProAttempt).length,
    uniquePaywallKeys: getPaywallTriggerKeys().length,
    uniqueAccountKeys: getAccountModalTriggerKeys().length,
  };
}

/**
 * Export registry as JSON string (for debugging/reporting)
 */
export function exportRegistryAsJSON(): string {
  return JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      summary: getGatingSummary(),
      gates: GATING_REGISTRY,
    },
    null,
    2
  );
}
