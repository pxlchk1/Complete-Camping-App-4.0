/**
 * Welcome Copy Utility
 * Provides personalized welcome messages based on visit history and first name.
 * 
 * REQUIREMENTS (March 2026 - DO NOT CHANGE WITHOUT PRODUCT APPROVAL):
 * ====================================================================
 * Title Logic:
 *   - NO firstName set: "Welcome Camper!"
 *   - firstName IS set + first visit (!hasSeenWelcomeHome): "Welcome, FirstName"
 *   - firstName IS set + returning (hasSeenWelcomeHome): "Welcome back, FirstName"
 * 
 * Subtitle Logic:
 *   - First ever visit (hasSeenWelcomeHome == false): "Your camping adventure starts here."
 *   - Subsequent visits: "Hope you've got snacks and a headlamp. Let's get you trip-ready."
 * ====================================================================
 */

// The single consistent cute subtitle for returning users
const RETURNING_USER_SUBTITLE = "Hope you've got snacks and a headlamp. Let's get you trip-ready.";
const FIRST_VISIT_SUBTITLE = "Your camping adventure starts here.";

// Camping type to subtext mapping (unused for main welcome, kept for other features)
const CAMPING_TYPE_MESSAGES: Record<string, string> = {
  "car camping": "Your trunk is ready for your next campsite haul.",
  "tent camping": "Your tent is ready for your next pitch.",
  "backpacking": "Your pack is ready for your next mile.",
  "hammock camping": "Your hammock is waiting for your next hang.",
  "dispersed camping (boondocking)": "Your quiet spot off the grid is calling.",
  "dispersed camping": "Your quiet spot off the grid is calling.",
  "boondocking": "Your quiet spot off the grid is calling.",
  "camper van camping": "Your van is ready for the next pull-off-with-a-view.",
  "van camping": "Your van is ready for the next pull-off-with-a-view.",
  "rv camping": "Your RV is ready for the next easy getaway.",
  "trailer camping (travel trailer)": "Your trailer is ready for the next home-base weekend.",
  "trailer camping": "Your trailer is ready for the next home-base weekend.",
  "travel trailer": "Your trailer is ready for the next home-base weekend.",
  "vintage camper camping": "Your vintage camper is ready for the next sweet little road trip.",
  "vintage camper": "Your vintage camper is ready for the next sweet little road trip.",
  "cabin camping": "Your cabin weekend is calling.",
  "cabin": "Your cabin weekend is calling.",
  "glamping": "Your coziest camp setup is ready.",
  "group camping": "Your crew is ready for the next campfire night.",
  "solo camping": "Your solo reset is waiting.",
  "bikepacking": "Your next ride-and-camp adventure is calling.",
  "boat camping": "Your next night near the water is waiting.",
  "winter camping": "Your winter camp is waiting for that first crisp breath.",
  "overlanding": "Your next backroad adventure is calling.",
};

/**
 * Get the welcome title based on visit history and firstName.
 * 
 * - No firstName → "Welcome Camper!"
 * - First visit + firstName → "Welcome, FirstName"
 * - Returning + firstName → "Welcome back, FirstName"
 * 
 * @param hasSeenWelcomeHome - Whether user has seen the first-time welcome
 * @param firstName - User's firstName from users collection
 * @param isLoggedIn - Whether the user is logged in
 * @returns The welcome title string
 */
export function getWelcomeTitle(
  hasSeenWelcomeHome: boolean,
  firstName?: string | null,
  isLoggedIn?: boolean
): string {
  const trimmedFirstName = firstName?.trim();
  const hasFirstName = trimmedFirstName && trimmedFirstName.length > 0;

  if (hasFirstName) {
    if (!hasSeenWelcomeHome) {
      return `Welcome, ${trimmedFirstName}`;
    }
    return `Welcome back, ${trimmedFirstName}`;
  }

  return "Welcome Camper!";
}

/**
 * Get the welcome subtitle based on welcome state.
 * @param hasSeenWelcomeHome - Whether user has seen the first-time welcome
 * @param isLoggedIn - Whether the user is logged in
 * @returns The welcome subtext string
 */
export function getWelcomeSubtext(
  hasSeenWelcomeHome: boolean,
  isLoggedIn?: boolean
): string {
  // Not logged in OR first-time user - show first visit subtitle
  if (!isLoggedIn || !hasSeenWelcomeHome) {
    return FIRST_VISIT_SUBTITLE;
  }

  // Returning user - show consistent cute subtitle
  return RETURNING_USER_SUBTITLE;
}

/**
 * Legacy: Get subtext based on camping type (kept for other features)
 */
export function getWelcomeSubtextByCampingStyle(favoriteCampingType?: string | null): string {
  if (!favoriteCampingType) {
    return RETURNING_USER_SUBTITLE;
  }

  // Normalize the camping type for lookup (lowercase, trimmed)
  const normalizedType = favoriteCampingType.toLowerCase().trim();
  
  // Try exact match first
  if (CAMPING_TYPE_MESSAGES[normalizedType]) {
    return CAMPING_TYPE_MESSAGES[normalizedType];
  }

  // Try matching with underscores replaced by spaces
  const withSpaces = normalizedType.replace(/_/g, " ");
  if (CAMPING_TYPE_MESSAGES[withSpaces]) {
    return CAMPING_TYPE_MESSAGES[withSpaces];
  }

  // Try partial matching for flexibility
  for (const [key, message] of Object.entries(CAMPING_TYPE_MESSAGES)) {
    if (normalizedType.includes(key) || key.includes(normalizedType)) {
      return message;
    }
  }

  return RETURNING_USER_SUBTITLE;
}
